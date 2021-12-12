import { registerIcons } from "@fluentui/react";
import { AddCircleRegular, ArrowClockwiseRegular, ArrowSortDownRegular, ArrowSortUpRegular, BookmarkRegular, CameraRegular, CheckmarkRegular, ChevronDownRegular, ChevronRightRegular, ChevronUpRegular, CircleRegular, CloudArrowDownRegular, CloudArrowUpRegular, CopyRegular, DeleteRegular, DocumentRegular, FolderRegular, FullScreenMaximizeRegular, InfoRegular, NavigationRegular, PhoneLaptopRegular, PhoneRegular, PlayRegular, PlugConnectedRegular, PlugDisconnectedRegular, SaveRegular, StopRegular, TextGrammarErrorRegular, WandRegular, WifiSettingsRegular, WindowConsoleRegular } from '@fluentui/react-icons';

const STYLE = {};

export function register() {
    registerIcons({
        icons: {
            AddCircle: <AddCircleRegular style={STYLE} />,
            ArrowClockwise: <ArrowClockwiseRegular style={STYLE} />,
            Bookmark: <BookmarkRegular style={STYLE} />,
            Camera: <CameraRegular style={STYLE} />,
            ChevronDown: <ChevronDownRegular style={STYLE} />,
            ChevronRight: <ChevronRightRegular style={STYLE} />,
            ChevronUp: <ChevronUpRegular style={STYLE} />,
            Circle: <CircleRegular style={STYLE} />,
            Copy: <CopyRegular style={STYLE} />,
            CloudArrowUp: <CloudArrowUpRegular style={STYLE} />,
            CloudArrowDown: <CloudArrowDownRegular style={STYLE} />,
            Delete: <DeleteRegular style={STYLE} />,
            Document: <DocumentRegular style={STYLE} />,
            Folder: <FolderRegular style={STYLE} />,
            FullScreenMaximize: <FullScreenMaximizeRegular style={STYLE} />,
            Info: <InfoRegular style={STYLE} />,
            Navigation: <NavigationRegular style={STYLE} />,
            Phone: <PhoneRegular style={STYLE} />,
            PhoneLaptop: <PhoneLaptopRegular style={STYLE} />,
            Play: <PlayRegular style={STYLE} />,
            PlugConnected: <PlugConnectedRegular style={STYLE} />,
            PlugDisconnected: <PlugDisconnectedRegular style={STYLE} />,
            Save: <SaveRegular style={STYLE} />,
            Stop: <StopRegular style={STYLE} />,
            TextGrammarError: <TextGrammarErrorRegular style={STYLE} />,
            Wand: <WandRegular style={STYLE} />,
            WifiSettings: <WifiSettingsRegular style={STYLE} />,
            WindowConsole: <WindowConsoleRegular style={STYLE} />,

            StatusCircleCheckmark: <CheckmarkRegular style={STYLE} />,
            ChevronUpSmall: <ChevronUpRegular style={STYLE} />,
            ChevronDownSmall: <ChevronDownRegular style={STYLE} />,
            CircleRing: <CircleRegular style={STYLE} />,
            SortUp: <ArrowSortUpRegular style={STYLE} />,
            SortDown: <ArrowSortDownRegular style={STYLE} />,

            Document20: <DocumentRegular style={{ fontSize: 20, verticalAlign: 'middle' }} />
        }
    });
}

export default {
    AddCircle: 'AddCircle',
    ArrowClockwise: 'ArrowClockwise',
    Bookmark: 'Bookmark',
    Camera: 'Camera',
    Copy: 'Copy',
    Circle: 'Circle',
    ChevronDown: 'ChevronDown',
    ChevronRight: 'ChevronRight',
    ChevronUp: 'ChevronUp',
    CloudArrowUp: 'CloudArrowUp',
    CloudArrowDown: 'CloudArrowDown',
    Delete: 'Delete',
    Document: 'Document',
    Folder: 'Folder',
    FullScreenMaximize: 'FullScreenMaximize',
    Info: 'Info',
    Navigation: 'Navigation',
    Phone: 'Phone',
    PhoneLaptop: 'PhoneLaptop',
    Play: 'Play',
    PlugConnected: 'PlugConnected',
    PlugDisconnected: 'PlugDisconnected',
    Save: 'Save',
    Stop: 'Stop',
    TextGrammarError: 'TextGrammarError',
    Wand: 'Wand',
    WifiSettings: 'WifiSettings',
    WindowConsole: 'WindowConsole',
    Document20: 'Document20'
};
