// cspell: ignore bugreport
// cspell: ignore bugreportz

import { AdbCommandBase, AdbShellProtocol } from "@yume-chan/adb";

export interface BugReportVersion {
    major: number;
    minor: number;
}

const BUG_REPORT_VERSION_REGEX = /(\d+)\.(\d+)/;

export class BugReport extends AdbCommandBase {
    public async bugReportZVersion(): Promise<BugReportVersion | undefined> {
        // bugreportz requires shell protocol
        if (!AdbShellProtocol.isSupported(this.adb)) {
            return undefined;
        }

        const { stderr, exitCode } = await this.adb.childProcess.spawnAndWait(['bugreportz', '-v']);
        if (exitCode !== 0 || stderr === '') {
            return undefined;
        }

        const match = stderr.match(BUG_REPORT_VERSION_REGEX);
        if (!match) {
            return undefined;
        }

        return {
            major: parseInt(match[1]!, 10),
            minor: parseInt(match[2]!, 10),
        };
    }
}
