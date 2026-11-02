// https://developer.android.com/reference/android/view/MotionEvent#constants_1
export const AndroidMotionEventAction = {
    Down: 0,
    Up: 1,
    Move: 2,
    Cancel: 3,
    Outside: 4,
    PointerDown: 5,
    PointerUp: 6,
    HoverMove: 7,
    Scroll: 8,
    HoverEnter: 9,
    HoverExit: 10,
    ButtonPress: 11,
    ButtonRelease: 12,
} as const;

export type AndroidMotionEventAction =
    (typeof AndroidMotionEventAction)[keyof typeof AndroidMotionEventAction];

export const AndroidMotionEventButton = {
    None: 0,
    Primary: 1,
    Secondary: 2,
    Tertiary: 4,
    Back: 8,
    Forward: 16,
    StylusPrimary: 32,
    StylusSecondary: 64,
} as const;

export type AndroidMotionEventButton =
    (typeof AndroidMotionEventButton)[keyof typeof AndroidMotionEventButton];
