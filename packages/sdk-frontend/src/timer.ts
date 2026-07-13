export class PageTimer {
    private accumulated = 0;
    private lastResume: number | null = null;

    constructor() {
        if (document.visibilityState === 'visible') {
            this.lastResume = Date.now();
        }
    }

    pause(): void {
        if (this.lastResume !== null) {
            this.accumulated += (Date.now() - this.lastResume) / 1000;
            this.lastResume = null;
        }
    }

    resume(): void {
        if (this.lastResume === null) {
            this.lastResume = Date.now();
        }
    }

    getDuration(): number {
        let total = this.accumulated;
        if (this.lastResume !== null) {
            total += (Date.now() - this.lastResume) / 1000;
        }
        return Math.round(total);
    }
}
