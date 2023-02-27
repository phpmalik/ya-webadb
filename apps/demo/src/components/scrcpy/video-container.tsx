import { makeStyles } from "@griffel/react";
import { AndroidMotionEventAction } from "@yume-chan/scrcpy";
import { MouseEvent, PointerEvent, useEffect, useState } from "react";
import { STATE } from "./state";

const useClasses = makeStyles({
    video: {
        transformOrigin: "center center",
        touchAction: "none",
    },
});

function handleWheel(e: WheelEvent) {
    if (!STATE.client) {
        return;
    }

    STATE.fullScreenContainer!.focus();
    e.preventDefault();
    e.stopPropagation();

    STATE.mouse!.scroll(-e.deltaX / 100, -e.deltaY / 100);
}

function injectTouch(
    action: AndroidMotionEventAction,
    e: PointerEvent<HTMLDivElement>
) {
    if (!STATE.client) {
        return;
    }

    const { x, y } = STATE.clientPositionToDevicePosition(e.clientX, e.clientY);

    const messages = STATE.hoverHelper!.process({
        action,
        pointerId: BigInt(e.pointerId),
        screenWidth: STATE.client.screenWidth!,
        screenHeight: STATE.client.screenHeight!,
        pointerX: x,
        pointerY: y,
        pressure: e.pressure,
        buttons: e.buttons,
    });
    for (const message of messages) {
        STATE.client.controlMessageSerializer!.injectTouch(message);
    }
}

function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return;
    }

    STATE.rendererContainer!.focus();
    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.pointerType === "mouse") {
        STATE.mouse!.down(e.button);
    } else {
        injectTouch(AndroidMotionEventAction.Down, e);
    }
}

function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.pointerType === "mouse") {
        const { x, y } = STATE.clientPositionToDevicePosition(
            e.clientX,
            e.clientY
        );
        STATE.mouse!.move(x, y, e.movementX, e.movementY);
    } else {
        injectTouch(AndroidMotionEventAction.Move, e);
    }
}

function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (e.pointerType === "mouse") {
        STATE.mouse!.up(e.button);
    } else {
        injectTouch(AndroidMotionEventAction.Up, e);
    }
}

function handlePointerLeave(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    // Because pointer capture on pointer down, this event only happens for hovering mouse and pen.
    // Release the injected pointer, otherwise it will stuck at the last position.
    injectTouch(AndroidMotionEventAction.HoverExit, e);
    injectTouch(AndroidMotionEventAction.Up, e);
}

function handleContextMenu(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
}

export function VideoContainer() {
    const classes = useClasses();

    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        STATE.setRendererContainer(container);

        if (!container) {
            return;
        }

        container.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [container]);

    return (
        <div
            ref={setContainer}
            className={classes.video}
            style={{
                width: STATE.width,
                height: STATE.height,
                transform: `translate(${
                    (STATE.rotatedWidth - STATE.width) / 2
                }px, ${(STATE.rotatedHeight - STATE.height) / 2}px) rotate(${
                    STATE.rotation * 90
                }deg)`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onContextMenu={handleContextMenu}
        />
    );
}
