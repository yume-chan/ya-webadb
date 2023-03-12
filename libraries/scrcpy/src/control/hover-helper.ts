import type { ScrcpyInjectTouchControlMessage } from "./inject-touch.js";
import { AndroidMotionEventAction } from "./inject-touch.js";
import { ScrcpyControlMessageType } from "./type.js";

/**
 * On both Android and Windows, while both mouse and touch are supported input devices,
 * only one of them can be active at a time. Touch the screen with a finger will deactivate mouse,
 * and move the mouse will deactivate touch.
 *
 * On Android, this is achieved by dispatching a `MotionEvent.ACTION_UP` event for the previous input type.
 * But on Chrome, there is no such event, causing both mouse and touch to be active at the same time.
 * This can cause the new input to appear as "ignored".
 *
 * This helper class synthesis `ACTION_UP` events when a different pointer type appears,
 * so Scrcpy server can remove the previously hovering pointer.
 */
export class ScrcpyHoverHelper {
    // AFAIK, only mouse and pen can have hover state
    // and you can't have two mouses or pens.
    // So remember the last hovering pointer is enough.
    private lastHoverMessage: ScrcpyInjectTouchControlMessage | undefined;

    public process(
        message: Omit<ScrcpyInjectTouchControlMessage, "type">
    ): ScrcpyInjectTouchControlMessage[] {
        const result: ScrcpyInjectTouchControlMessage[] = [];

        // A different pointer appeared,
        // Cancel previously hovering pointer so Scrcpy server can free up the pointer ID.
        if (
            this.lastHoverMessage &&
            this.lastHoverMessage.pointerId !== message.pointerId
        ) {
            // TODO: Inject MotionEvent.ACTION_HOVER_EXIT
            // From testing, it seems no App cares about this event.
            result.push({
                ...this.lastHoverMessage,
                action: AndroidMotionEventAction.Up,
            });
            this.lastHoverMessage = undefined;
        }

        if (message.action === AndroidMotionEventAction.HoverMove) {
            // TODO: Inject MotionEvent.ACTION_HOVER_ENTER
            this.lastHoverMessage = message as ScrcpyInjectTouchControlMessage;
        }

        (message as ScrcpyInjectTouchControlMessage).type =
            ScrcpyControlMessageType.InjectTouch;
        result.push(message as ScrcpyInjectTouchControlMessage);

        return result;
    }
}
