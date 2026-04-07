// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
export const LinuxFileType = {
    Directory: 0o04,
    File: 0o10,
    Link: 0o12,
} as const;

export type LinuxFileType = (typeof LinuxFileType)[keyof typeof LinuxFileType];

export const AndroidSyscallErrorCode = {
    SUCCESS: 0,
    EACCES: 13,
    EEXIST: 17,
    EFAULT: 14,
    EFBIG: 27,
    EINTR: 4,
    EINVAL: 22,
    EIO: 5,
    EISDIR: 21,
    ELOOP: 40,
    EMFILE: 24,
    ENAMETOOLONG: 36,
    ENFILE: 23,
    ENOENT: 2,
    ENOMEM: 12,
    ENOSPC: 28,
    ENOTDIR: 20,
    EOVERFLOW: 75,
    EPERM: 1,
    EROFS: 30,
    ETXTBSY: 26,
} as const;

export type AndroidSyscallErrorCode =
    (typeof AndroidSyscallErrorCode)[keyof typeof AndroidSyscallErrorCode];

export const AndroidSyscallErrorNameMap = /* #__PURE__ */ (() =>
    Object.fromEntries(
        Object.entries(AndroidSyscallErrorCode).map(([key, value]) => [
            value,
            key,
        ]),
    ))();
