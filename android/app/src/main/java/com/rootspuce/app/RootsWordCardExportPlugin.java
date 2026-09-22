package com.rootspuce.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** App-local PNG export. No broad storage/photo-reading permission, no uploads. */
@CapacitorPlugin(name = "RootsWordCardExport")
public class RootsWordCardExportPlugin extends Plugin {
    private static final int MAX_IMAGE_BYTES = 16 * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean saving = new AtomicBoolean(false);
    // Only used on the main thread while the Android 7-9 document picker is open.
    private File pendingExportFile;

    private File prepare(PluginCall call) throws IOException {
        String filename = call.getString("filename");
        String base64 = call.getString("base64");
        if (filename == null || !filename.matches("Christian-Roots-[0-9]{4}-[0-9]{2}-[0-9]{2}-(ko|en|de|fr|es)\\.png")) {
            throw new IOException("Invalid filename");
        }
        if (base64 == null || base64.length() > 22_369_624) throw new IOException("Invalid image");
        final byte[] data;
        try { data = Base64.decode(base64, Base64.NO_WRAP); }
        catch (IllegalArgumentException error) { throw new IOException("Invalid image"); }
        byte[] signature = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
        if (data.length < signature.length || data.length > MAX_IMAGE_BYTES) throw new IOException("Invalid image");
        for (int i = 0; i < signature.length; i++) if (data[i] != signature[i]) throw new IOException("Invalid image");
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(data, 0, data.length, options);
        if (!"image/png".equals(options.outMimeType) || options.outWidth <= 0 || options.outWidth > 4096
                || options.outHeight <= 0 || options.outHeight > 14000
                || (long) options.outWidth * options.outHeight > 60_000_000L) throw new IOException("Invalid image");

        File root = new File(getContext().getCacheDir(), "roots-word-cards");
        if (!root.isDirectory() && !root.mkdirs()) throw new IOException("Cannot create cache");
        cleanupOldShares(root);
        File directory = new File(root, System.currentTimeMillis() + "_" + UUID.randomUUID());
        if (!directory.mkdirs()) throw new IOException("Cannot create cache");
        File image = new File(directory, filename);
        try (OutputStream output = new FileOutputStream(image)) { output.write(data); }
        catch (IOException error) { removeScratch(image); throw error; }
        return image;
    }

    private void cleanupOldShares(File root) {
        File[] directories = root.listFiles();
        if (directories == null) return;
        long cutoff = System.currentTimeMillis() - 86_400_000L;
        for (File directory : directories) {
            String[] parts = directory.getName().split("_", 2);
            try {
                if (parts.length != 2 || !directory.isDirectory()) continue;
                long created = Long.parseLong(parts[0]);
                UUID.fromString(parts[1]);
                if (created <= 0 || created >= cutoff || !directory.getCanonicalFile().getParentFile().equals(root.getCanonicalFile())) continue;
                File[] files = directory.listFiles();
                if (files != null) for (File file : files) {
                    if (file.isFile() && file.getName().matches("Christian-Roots-[0-9-]+-(ko|en|de|fr|es)\\.png")) file.delete();
                }
                directory.delete();
            } catch (IOException | IllegalArgumentException ignored) { /* Never traverse another directory. */ }
        }
    }
    private void removeScratch(File file) {
        if (file != null) { file.delete(); File parent = file.getParentFile(); if (parent != null) parent.delete(); }
    }
    private void copy(File file, Uri destination) throws IOException {
        try (FileInputStream input = new FileInputStream(file);
             OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) throw new IOException("Cannot open destination");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            output.flush();
        }
    }

    @PluginMethod
    public void prepareImage(PluginCall call) {
        worker.execute(() -> {
            try {
                File file = prepare(call);
                JSObject result = new JSObject();
                // Existing Capacitor Share uses its FileProvider for cache files.
                result.put("uri", Uri.fromFile(file).toString());
                call.resolve(result);
                // Retain temporarily for recipients that read after the sheet closes.
            } catch (Exception error) { call.reject("Could not prepare word card image", "IMAGE_PREPARE_FAILED"); }
        });
    }

    @PluginMethod
    public void saveImage(PluginCall call) {
        if (!saving.compareAndSet(false, true)) { call.reject("A save is already in progress", "EXPORT_BUSY"); return; }
        worker.execute(() -> {
            File file = null;
            try {
                file = prepare(call);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    saveToGallery(call, file);
                } else {
                    File exportFile = file;
                    getBridge().executeOnMainThread(() -> {
                        pendingExportFile = exportFile;
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("image/png");
                        intent.putExtra(Intent.EXTRA_TITLE, exportFile.getName());
                        try { startActivityForResult(call, intent, "onDocumentCreated"); }
                        catch (Exception error) {
                            pendingExportFile = null; removeScratch(exportFile); saving.set(false);
                            call.reject("Could not open save dialog", "SAVE_FAILED");
                        }
                    });
                }
            } catch (Exception error) {
                removeScratch(file); saving.set(false);
                call.reject("Could not save word card image", "SAVE_FAILED");
            }
        });
    }

    // Android 10+: add our own PNG to Pictures; no library-read permission needed.
    private void saveToGallery(PluginCall call, File file) throws IOException {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, file.getName());
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Christian Roots");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri destination = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (destination == null) throw new IOException("Cannot create gallery image");
        try {
            copy(file, destination);
            ContentValues published = new ContentValues();
            published.put(MediaStore.Images.Media.IS_PENDING, 0);
            if (getContext().getContentResolver().update(destination, published, null, null) <= 0) throw new IOException("Cannot publish image");
            JSObject result = new JSObject(); result.put("destination", "photos");
            call.resolve(result);
        } catch (Exception error) {
            try { getContext().getContentResolver().delete(destination, null, null); } catch (Exception ignored) { }
            throw new IOException("Image write failed", error);
        } finally { removeScratch(file); saving.set(false); }
    }

    @ActivityCallback
    private void onDocumentCreated(PluginCall call, ActivityResult activityResult) {
        File file = pendingExportFile;
        pendingExportFile = null;
        if (call == null) { removeScratch(file); saving.set(false); return; }
        Uri destination = activityResult.getData() == null ? null : activityResult.getData().getData();
        if (activityResult.getResultCode() != Activity.RESULT_OK || destination == null) {
            removeScratch(file); saving.set(false); call.reject("Save cancelled", "CANCELLED"); return;
        }
        worker.execute(() -> {
            try {
                if (file == null || !file.isFile()) throw new IOException("No pending image");
                copy(file, destination);
                JSObject result = new JSObject(); result.put("destination", "files"); call.resolve(result);
            } catch (Exception error) { call.reject("Could not save word card image", "SAVE_FAILED"); }
            finally { removeScratch(file); saving.set(false); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdown();
        super.handleOnDestroy();
    }
}
