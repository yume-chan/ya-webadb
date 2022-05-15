import { registerIcons } from "@fluentui/react";
import { BookSearchRegular, AddCircleRegular, ArrowClockwiseRegular, ArrowRotateClockwiseRegular, ArrowRotateCounterclockwiseRegular, ArrowSortDownRegular, ArrowSortUpRegular, BookmarkRegular, BoxRegular, BugRegular, CameraRegular, CheckmarkRegular, ChevronDownRegular, ChevronRightRegular, ChevronUpRegular, CircleRegular, CloudArrowDownRegular, CloudArrowUpRegular, CopyRegular, DeleteRegular, DocumentRegular, FilterRegular, FolderRegular, FullScreenMaximizeRegular, InfoRegular, MoreHorizontalRegular, NavigationRegular, OrientationRegular, PanelBottomRegular, PersonFeedbackRegular, PhoneLaptopRegular, PhoneRegular, PlayRegular, PlugConnectedRegular, PlugDisconnectedRegular, PowerRegular, SaveRegular, SearchRegular, SettingsRegular, StopRegular, TextGrammarErrorRegular, WandRegular, WarningRegular, WifiSettingsRegular, WindowConsoleRegular } from '@fluentui/react-icons';

const STYLE = {};

export function register() {
    registerIcons({
        icons: {
            // General use
            AddCircle: <AddCircleRegular style={STYLE} />,
            ArrowClockwise: <ArrowClockwiseRegular style={STYLE} />,
            Bookmark: <BookmarkRegular style={STYLE} />,
            BookSearch: <BookSearchRegular style={STYLE} />,
            Box: <BoxRegular style={STYLE} />,
            Bug: <BugRegular style={STYLE} />,
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
            Orientation: <OrientationRegular style={STYLE} />,
            PanelBottom: <PanelBottomRegular style={STYLE} />,
            PersonFeedback: <PersonFeedbackRegular style={STYLE} />,
            Phone: <PhoneRegular style={STYLE} />,
            PhoneLaptop: <PhoneLaptopRegular style={STYLE} />,
            Play: <PlayRegular style={STYLE} />,
            PlugConnected: <PlugConnectedRegular style={STYLE} />,
            PlugDisconnected: <PlugDisconnectedRegular style={STYLE} />,
            Power: <PowerRegular style={STYLE} />,
            RotateLeft: <ArrowRotateCounterclockwiseRegular style={STYLE} />,
            RotateRight: <ArrowRotateClockwiseRegular style={STYLE} />,
            Save: <SaveRegular style={STYLE} />,
            Settings: <SettingsRegular style={STYLE} />,
            Stop: <StopRegular style={STYLE} />,
            TextGrammarError: <TextGrammarErrorRegular style={STYLE} />,
            Wand: <WandRegular style={STYLE} />,
            Warning: <WarningRegular style={STYLE} />,
            WifiSettings: <WifiSettingsRegular style={STYLE} />,
            WindowConsole: <WindowConsoleRegular style={STYLE} />,

            // Required by @fluentui/react
            StatusCircleCheckmark: <CheckmarkRegular style={STYLE} />,
            ChevronUpSmall: <ChevronUpRegular style={STYLE} />,
            ChevronDownSmall: <ChevronDownRegular style={STYLE} />,
            CircleRing: <CircleRegular style={STYLE} />,
            More: <MoreHorizontalRegular />,
            SortUp: <ArrowSortUpRegular style={STYLE} />,
            SortDown: <ArrowSortDownRegular style={STYLE} />,
            Search: <SearchRegular style={STYLE} />,
            Filter: <FilterRegular style={STYLE} />,

            // Required by file manager page
            Document20: <DocumentRegular style={{ fontSize: 20, verticalAlign: 'middle' }} />
        }
    });
}

export default {
    AddCircle: 'AddCircle',
    ArrowClockwise: 'ArrowClockwise',
    Bookmark: 'Bookmark',
    BookSearch: 'BookSearch',
    Box: 'Box',
    Bug: 'Bug',
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
    Orientation: 'Orientation',
    PanelBottom: 'PanelBottom',
    PersonFeedback: 'PersonFeedback',
    Phone: 'Phone',
    PhoneLaptop: 'PhoneLaptop',
    Play: 'Play',
    PlugConnected: 'PlugConnected',
    PlugDisconnected: 'PlugDisconnected',
    Power: 'Power',
    RotateLeft: 'RotateLeft',
    RotateRight: 'RotateRight',
    Save: 'Save',
    Settings: 'Settings',
    Stop: 'Stop',
    TextGrammarError: 'TextGrammarError',
    Wand: 'Wand',
    Warning: 'Warning',
    WifiSettings: 'WifiSettings',
    WindowConsole: 'WindowConsole',
    Document20: 'Document20'
};
