import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Accordion from 'react-bootstrap/Accordion';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { TapSession, TapStatistics, TapResult } from './tap-session';

import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

function Result({ result }: { result: TapResult }): React.ReactElement {
    return (
        <Accordion.Item className={result.state} eventKey={result.description}>
            <Accordion.Header>{result.state}: {result.description}</Accordion.Header>
            <Accordion.Body><pre><code>{result.comments.join('')}</code></pre></Accordion.Body>
        </Accordion.Item>
    );
}

function LogViewer({ session }: { session: TapSession }): React.ReactElement {
    const [prologue, setPrologue] = React.useState<string[]>([...session.prologue]);
    const [results, setResults] = React.useState<TapResult[]>([...session.results]);
    const [epilogue, setEpilogue] = React.useState<string[]>([...session.epilogue]);
    const [plan, setPlan] = React.useState<number>(session.plan || 0);

    React.useEffect(() => {
        function update() {
            console.log(['update!', session, session.done]);
            setEpilogue([...session.epilogue]);
            setPrologue([...session.prologue]);
            setResults([...session.results]);
            setPlan(session.plan || 0);
        }
        session.on('changed', update);
        return () => {
            session.off('changed', update);
        }
    });

    return (
        <Accordion defaultActiveKey="prologue">
            <hr/>
            {
                prologue.length ? [
                    <Accordion.Item eventKey="prologue">
                        <Accordion.Header>Prologue</Accordion.Header>
                        <Accordion.Body><pre><code>{prologue.join('')}</code></pre></Accordion.Body>
                    </Accordion.Item>
                ] : []
            }
            {
                results.map(result => (<Result result={result}/>))
            }
            {
                epilogue.length ? [
                    <Accordion.Item eventKey="epilogue">
                        <Accordion.Header>Epilogue</Accordion.Header>
                        <Accordion.Body><pre><code>{epilogue.join('')}</code></pre></Accordion.Body>
                    </Accordion.Item>
                ]: []
            }

        </Accordion>
    );
}


function Progress({ session }: { session: TapSession }): React.ReactElement {
    const [running, setRunning] = React.useState<boolean>(!session.done);
    const [stats, setStats] = React.useState<TapStatistics>(session.stats);
    const [plan, setPlan] = React.useState<number>(session.plan || 0);

    React.useEffect(() => {
        function update() {
            setRunning(!session.done);
            setStats(session.stats);
            setPlan(session.plan || 0);
        }
        session.on('changed', update);
        return () => {
            session.off('changed', update);
        }
    });

    return (
        <ProgressBar>
          <ProgressBar animated={running} striped variant="success" now={stats.passed} key={1} max={plan}/>
          <ProgressBar animated={running} striped variant="warning" now={stats.skipped} key={2} max={plan}/>
          <ProgressBar animated={running} striped variant="info" now={stats.xfailed} key={3} max={plan}/>
          <ProgressBar animated={running} striped variant="warning" now={stats.xpassed} key={4} max={plan}/>
          <ProgressBar animated={running} striped variant="danger" now={stats.failed} key={5} max={plan}/>
        </ProgressBar>
    );
}

function App(): React.ReactElement {
    const session = new TapSession();

    async function tap() {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const response = await fetch('/log');
        if (response.ok) {
            const all = await response.text();
            let start = 0;
            while (start < all.length) {
                const end = start + 1024;
                session.feed(all.slice(start, end));
                await sleep(100);
                start = end;
            }
            session.eof();
        } else {
            console.log('failed to fetch /log', response);
        }
    }

    tap();

    return (
        <div>
            <Progress session={session}/>
            <hr/>
            <LogViewer session={session}/>
        </div>
    );
}

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App/>);
