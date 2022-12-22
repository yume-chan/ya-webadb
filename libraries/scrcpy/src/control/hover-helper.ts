import {
    AndroidMotionEventAction,
    type ScrcpyInjectTouchControlMessage,
} from "./inject-touch.js";
import { ScrcpyControlMessageType } from "./type.js";

/**
 * On Android, touching the screen with a finger will disable mouse cursor.
 * However, Scrcpy doesn't do that, and can inject two pointers at the same time.
 * This can cause finger events to be "ignored" because mouse is still the primary pointer.
 *
 * This helper class injects an extra `ACTION_UP` event,
 * so Scrcpy server can remove the previously hovering pointer.
 */
export class ScrcpyHoverHelper {
    // AFAIK, only mouse and pen can have hover state
    // and you can't have two mouses or pens.
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
