export type InputSource = 'keyboard' | 'controller';

export interface InputFrame {
  source?: InputSource;
  horizontal: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  pausePressed: boolean;
  mutePressed: boolean;
  storyPressed?: boolean;
}

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'Escape', 'KeyM', 'KeyR']);
/** Standard-mapping face cluster (A/B/X/Y): accept any of them for jump, since some
 * controllers/browsers don't land the primary action on button 0 as expected. */
const JUMP_BUTTONS = [0, 1, 2, 3];

/** Polled every rendered frame, even while simulation is paused. */
export class BrowserInput {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private previousPadJump = false;
  private previousPadPause = false;
  private previousPadStory = false;
  private blockedPads = false;
  private focused = true;
  private source: InputSource = 'keyboard';
  private previousPadAction = '';

  constructor(private readonly target: Window, private readonly interact: () => void) {
    target.addEventListener('keydown', this.keyDown);
    target.addEventListener('keyup', this.keyUp);
    target.addEventListener('gamepaddisconnected', this.clear);
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (!this.focused) return;
    if (!KEYS.has(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (!this.held.has(event.code)) this.pressed.add(event.code);
    this.held.add(event.code);
    this.source = 'keyboard';
    this.interact();
  };

  private keyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  clear = (): void => {
    this.held.clear();
    this.pressed.clear();
    this.previousPadJump = false;
    this.previousPadPause = false;
    this.previousPadStory = false;
    // Require release after focus recovery before accepting held controller input.
    this.blockedPads = true;
  };

  setFocused(focused: boolean): void {
    if (focused !== this.focused) this.clear();
    this.focused = focused;
  }

  poll(): InputFrame {
    if (!this.focused) {
      return { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
    }
    const pads = this.target.navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((item) => item?.connected && item.mapping === 'standard');
    let axis = pad?.axes[0] ?? 0;
    if (Math.abs(axis) < 0.2) axis = 0;
    let left = pad?.buttons[14]?.pressed ?? false;
    let right = pad?.buttons[15]?.pressed ?? false;
    let jump = JUMP_BUTTONS.some((index) => pad?.buttons[index]?.pressed);
    let pause = pad?.buttons[9]?.pressed ?? false;
    let story = pad?.buttons[8]?.pressed ?? false;
    if (this.blockedPads) {
      if (!axis && !left && !right && !jump && !pause && !story) this.blockedPads = false;
      axis = 0;
      left = right = jump = pause = story = false;
    }
    const padActivity = Boolean(axis || left || right || jump || pause || story);
    const padAction = `${Math.sign(axis)},${left},${right},${jump},${pause},${story}`;
    if (!pad) this.source = 'keyboard';
    else if (padActivity && padAction !== this.previousPadAction) this.source = 'controller';
    this.previousPadAction = padAction;
    const padJumpPressed = jump && !this.previousPadJump;
    const padPausePressed = pause && !this.previousPadPause;
    if (padJumpPressed || padPausePressed) this.interact();
    const keyboardAxis = Number(this.held.has('ArrowRight') || this.held.has('KeyD'))
      - Number(this.held.has('ArrowLeft') || this.held.has('KeyA'));
    const frame = {
      source: this.source,
      horizontal: Math.max(-1, Math.min(1, keyboardAxis + axis + Number(right) - Number(left))),
      jumpHeld: this.held.has('Space') || jump,
      jumpPressed: this.pressed.has('Space') || padJumpPressed,
      pausePressed: this.pressed.has('Escape') || padPausePressed,
      mutePressed: this.pressed.has('KeyM'),
      storyPressed: this.pressed.has('KeyR') || (story && !this.previousPadStory),
    };
    this.pressed.clear();
    this.previousPadJump = jump;
    this.previousPadPause = pause;
    this.previousPadStory = story;
    return frame;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.keyDown);
    this.target.removeEventListener('keyup', this.keyUp);
    this.target.removeEventListener('gamepaddisconnected', this.clear);
    this.clear();
  }
}
