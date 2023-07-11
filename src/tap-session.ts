import { EventEmitter } from 'events';
import { parse } from 'yaml';

export interface TapStatistics {
    pass: number;    // ok
    skip: number;    // ok      # skip
    fail: number;    // not ok
    xpass: number;   // not ok  # todo
    xfail: number;   // ok      # todo
}

export class TapResult extends EventEmitter {
    ok: boolean;
    number: number;
    description: string;
    todo: boolean;
    skip: boolean;
    reason: string | null;
    attrs: ReturnType<typeof parse> | null = null;
    comments: string[];

    constructor(ok: boolean, number: number, description: string, directive_type: string | null, reason: string | null, comments: string[]) {
        super();

        this.ok = ok;
        this.number = number;
        this.description = description;
        this.todo = (directive_type === 'TODO');
        this.skip = (directive_type === 'SKIP');
        this.reason = reason;
        this.comments = comments;
    }

    set_yaml(attrs: ReturnType<typeof parse>): void {
        this.attrs = attrs;
        this.emit('done')
    }

    get done() : boolean {
        return this.attrs != null;
    }

    get status() : keyof TapStatistics {
        if (this.skip) {
            return 'skip'
        } else if (this.todo) {
            return this.ok ? 'xpass' : 'xfail';
        } else {
            return this.ok ? 'pass' : 'fail';
        }
    }
}

export class TapSession extends EventEmitter {
    prologue: string[] = [];
    version: number | null = null;
    plan: number | null = null;
    results: TapResult[] = [];
    epilogue: string[] = [];
    done: boolean = false;

    stats: TapStatistics = { pass: 0, skip: 0, fail: 0, xpass: 0, xfail: 0 };

    #comments: string[];
    #current_result: TapResult | null = null;
    #partial_line: string = '';
    #partial_yaml_block: string[] | null = null;
    #pending_changes: Set<string> = new Set();

    constructor() {
        super();
        this.#comments = this.prologue;
    }

    reset_comments(): void {
        if (this.results.length === this.plan) {
            this.#comments = this.epilogue;
        } else {
            this.#comments = [];
        }
    }

    modify_current_result(line: string): boolean {
        if (!this.#current_result) {
            return false;
        }

        if (this.#partial_yaml_block && line.match(/^ {2}/)) {
            // more data for an already-open yaml block
            if (line === '  ...') {
                this.end_current_result();
            } else {
                this.#partial_yaml_block.push(line);
            }
            return true;
        } else if (line === '  ---\n') {
            // start of a yaml block
            this.#partial_yaml_block = [];
            return true;
        } else {
            // this data is not for us, so the partial result is done
            this.end_current_result();
            return false;
        }
    }

    end_current_result() : void {
        if (this.#current_result) {
            const attrs = this.#partial_yaml_block ? parse(this.#partial_yaml_block.join()) : null;
            this.#current_result.set_yaml(attrs);
            this.#partial_yaml_block = null;
            this.#current_result = null;
        }
    }

    version_line_re = /^TAP version (\d+)\n$/;
    version_line(match: string[]) : void {
        this.version = parseInt(match[1]!);
        this.#pending_changes.add('version');
    }

    plan_line_re = /^1\.\.(\d+)( # (.+))?\n$/;
    plan_line(match: string[]) : void {
        this.plan = parseInt(match[1]!);
        this.#pending_changes.add('plan');
        this.reset_comments();
    }

    result_line_re = /^(not )?ok (\d+) (?:- )?([^#]+?)(?:\s+# (SKIP|TODO)\s*(.*))?\n$/;
    result_line(match: string[]) : void {
        const [ not, number, description, directive_type, reason ] = match.slice(1);
        const result = new TapResult(!not, parseInt(number!), description!, directive_type || null, reason || null, this.#comments);
        this.#current_result = result;
        this.results.push(result);

        this.stats = Object.assign({}, this.stats);
        this.stats[result.status]++;

        this.reset_comments();
        this.#pending_changes.add('results');
        this.#pending_changes.add('stats');
    }

    feed_line(line: string): void {
        let match;

        /* See if the incoming line modifies the current result */
        if (this.modify_current_result(line)) {
            /* handled */
        } else if ((match = line.match(this.version_line_re))) {
            this.version_line(match);
        } else if ((match = line.match(this.plan_line_re))) {
            this.plan_line(match);
        } else if ((match = line.match(this.result_line_re))) {
            this.result_line(match);
        } else {
            /* everything else gets treated as comments... */
            this.#comments.push(line);
            if (this.#comments === this.prologue) {
                this.#pending_changes.add('prologue');
            }
        }
    }

    emit_pending_changes() {
        if (this.#pending_changes.size) {
            this.emit('notify', this.#pending_changes);
            this.#pending_changes = new Set();
        }
    }

    feed(input: string): void {
        if (this.done)
            throw new Error("eof() already called");

        let start = 0;
        let end: number;
        while ((end = input.indexOf('\n', start)) !== -1) {
            this.feed_line(this.#partial_line + input.slice(start, end + 1));
            this.#partial_line = '';
            start = end + 1;
        }
        this.#partial_line = input.slice(start);
        this.emit_pending_changes();
    }

    eof() : void {
        console.log('eof!')
        if (this.#partial_line) {
            // this could theoretically be something helpful
            this.feed_line(this.#partial_line);
            this.#partial_line = '';
        }
        this.end_current_result();
        this.epilogue.push(...this.#comments);
        this.done = true;
        this.#pending_changes.add('done');
        this.emit_pending_changes();
    }
}
