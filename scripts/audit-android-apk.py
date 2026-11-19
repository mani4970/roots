#!/usr/bin/env python3
"""Audit an Android APK's native 16 KB layout without Android SDK tools."""

import argparse
import re
import struct
import sys
import zipfile
from pathlib import Path

PAGE = 16384


class AuditError(Exception):
    pass


def region(data, offset, size):
    if offset < 0 or size < 0 or offset > len(data) or size > len(data) - offset:
        raise AuditError("truncated or out-of-bounds ELF/ZIP metadata")
    return data[offset:offset + size]


def unpack(data, fmt, offset):
    return struct.unpack(fmt, region(data, offset, struct.calcsize(fmt)))


def cstring(data, offset):
    if offset >= len(data) or data.find(b"\0", offset) < 0:
        raise AuditError("invalid ELF string table")
    return data[offset:data.index(b"\0", offset)].decode("utf-8", "replace")


def outside_relro(start, end, relro):
    pieces = [(start, end)]
    for left, right in relro:
        remaining = []
        for a, b in pieces:
            if b <= left or a >= right:
                remaining.append((a, b))
            else:
                if a < left:
                    remaining.append((a, left))
                if b > right:
                    remaining.append((right, b))
        pieces = remaining
    return pieces


def audit_elf(data):
    if len(data) < 16 or data[:4] != b"\x7fELF" or data[6] != 1:
        raise AuditError("invalid ELF header")
    bits = {1: 32, 2: 64}.get(data[4])
    endian = {1: "<", 2: ">"}.get(data[5])
    if not bits or not endian:
        raise AuditError("unsupported ELF class or byte order")
    header = unpack(data, endian + ("HHIQQQIHHHHHH" if bits == 64 else "HHIIIIIHHHHHH"), 16)
    _, _, version, _, phoff, shoff, _, ehsize, phsize, phnum, shsize, shnum, names_index = header
    if header[0] != 3 or version != 1 or ehsize != (64 if bits == 64 else 52):
        raise AuditError("invalid shared-library ELF header")
    if not phnum or phnum == 0xffff or phsize != (56 if bits == 64 else 32):
        raise AuditError("unsupported or invalid ELF program headers")
    if not shnum or shsize != (64 if bits == 64 else 40) or names_index >= shnum:
        raise AuditError("section headers required for RELRO audit; extended numbering unsupported")
    region(data, phoff, phsize * phnum)
    region(data, shoff, shsize * shnum)
    relro, notes, loads, problems = [], [], [], []
    for i in range(phnum):
        p = unpack(data, endian + ("IIQQQQQQ" if bits == 64 else "IIIIIIII"), phoff + i * phsize)
        if bits == 64:
            kind, flags, offset, address, _, filesz, memsz, align = p
        else:
            kind, offset, address, _, filesz, memsz, flags, align = p
        region(data, offset, filesz)
        if address + memsz > 1 << bits:
            raise AuditError("overflowing ELF segment address")
        if kind == 1:
            if filesz > memsz or (align > 1 and (align & (align - 1) or (offset - address) % align)):
                raise AuditError("invalid LOAD segment size/alignment/congruence")
            loads.append(align)
            if bits == 64 and align < PAGE:
                problems.append(f"LOAD alignment {align} is below 16 KB")
        elif kind == 0x6474e552 and memsz:
            relro.append((address, address + memsz))
        elif kind == 4:
            notes.append(region(data, offset, filesz))
    if not loads:
        raise AuditError("ELF has no LOAD segments")
    sections = [unpack(data, endian + ("IIQQQQIIQQ" if bits == 64 else "IIIIIIIIII"), shoff + i * shsize)
                for i in range(shnum)]
    names = region(data, sections[names_index][4], sections[names_index][5]) if names_index else b""
    for i, s in enumerate(sections):
        name = cstring(names, s[0]) if names else f"section #{i}"
        if s[1] != 8:  # SHT_NOBITS has no bytes in the file.
            region(data, s[4], s[5])
        if s[3] + s[5] > 1 << bits:
            raise AuditError("overflowing ELF section address")
        if s[2] & 3 != 3 or not s[5]:  # Both SHF_WRITE and SHF_ALLOC.
            continue
        for a, b in outside_relro(s[3], s[3] + s[5], relro):
            if any(a < (end + PAGE - 1) // PAGE * PAGE and b > start // PAGE * PAGE
                   for start, end in relro):
                if bits == 64:
                    problems.append(f"writable {name} overlaps a 16 KB RELRO-protected page")
    ndk = set()
    for note in notes:
        cursor = 0
        while cursor < len(note):
            if len(note) - cursor < 12 and not any(note[cursor:]):
                break
            namesz, descsz, kind = unpack(note, endian + "III", cursor)
            cursor += 12
            owner = region(note, cursor, namesz).rstrip(b"\0")
            cursor += (namesz + 3) // 4 * 4
            desc = region(note, cursor, descsz)
            cursor += (descsz + 3) // 4 * 4
            if cursor > len(note):
                raise AuditError("truncated ELF note padding")
            if owner == b"Android" and kind == 1 and len(desc) >= 68:
                ndk.add(desc[4:68].split(b"\0", 1)[0].decode("ascii", "replace"))
    return bits, loads, sorted(ndk), problems


def dex_size(apk):
    with zipfile.ZipFile(apk) as archive:
        return sum(i.file_size for i in archive.infolist() if re.fullmatch(r"classes\d*\.dex", i.filename))


def audit_apk(apk):
    failures, native_count = [], 0
    with zipfile.ZipFile(apk) as archive, open(apk, "rb") as raw:
        bad = archive.testzip()
        if bad:
            raise AuditError(f"ZIP CRC failure: {bad}")
        for item in archive.infolist():
            if not item.filename.endswith(".so"):
                continue
            native_count += 1
            try:
                raw.seek(item.header_offset)
                header = raw.read(30)
                if len(header) != 30 or header[:4] != b"PK\x03\x04":
                    raise AuditError("invalid ZIP local header")
                name_size, extra_size = struct.unpack_from("<HH", header, 26)
                data_offset = item.header_offset + 30 + name_size + extra_size
                bits, loads, ndk, problems = audit_elf(archive.read(item))
                if item.compress_type == zipfile.ZIP_STORED:
                    packaging = f"stored@{data_offset}"
                    if data_offset % PAGE:
                        problems.append("uncompressed ZIP entry is not 16 KB aligned")
                else:
                    packaging = "compressed (ZIP alignment not applicable)"
                label = "FAIL" if problems else "PASS"
                print(f"{label} {item.filename}: ELF{bits}, LOAD min={min(loads)}, {packaging}; NDK={','.join(ndk) or 'unknown'} (info)")
                for problem in problems:
                    failures.append(f"{item.filename}: {problem}")
            except (AuditError, struct.error) as error:
                failures.append(f"{item.filename}: {error}")
    for failure in failures:
        print(f"ERROR {failure}", file=sys.stderr)
    print(f"Native libraries: {native_count}; failures: {len(failures)}; 16 KB ELF/RELRO minimum enforced for ELF64.")
    return not failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--baseline", type=Path, help="earlier APK for uncompressed DEX size comparison")
    args = parser.parse_args()
    try:
        passed = audit_apk(args.apk)
        current = dex_size(args.apk)
        print(f"Uncompressed DEX: {current:,} bytes ({current / 1048576:.2f} MiB)")
        if args.baseline:
            previous = dex_size(args.baseline)
            change = f"{(current - previous) / previous:+.1%}" if previous else "n/a (empty baseline)"
            print(f"Baseline DEX: {previous:,} bytes; change: {current - previous:+,} bytes ({change})")
        print("Static audit only: old NDK metadata alone is not a failure; test on a 16 KB device/emulator.")
        return 0 if passed else 1
    except (AuditError, OSError, zipfile.BadZipFile, RuntimeError, NotImplementedError, struct.error) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
