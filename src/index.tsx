
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Accordion from 'react-bootstrap/Accordion';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { TapResult, TapSession } from './tap-session';
import useProperties from './use-properties';

import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

function Result({ result }: { result: TapResult }): React.ReactElement {
    const { comments, description, status } = useProperties(result, ['comments', 'description', 'status']);

    return (
        <Accordion.Item className={status} eventKey={result.description}>
            <Accordion.Header>{status}: {description}</Accordion.Header>
            <Accordion.Body><pre><code>{comments.join('')}</code></pre></Accordion.Body>
        </Accordion.Item>
    );
}

function LogViewer({ session }: { session: TapSession }): React.ReactElement {
    const { prologue, results, epilogue } = useProperties(session, ['prologue', 'results', 'epilogue']);

    return (
        <Accordion defaultActiveKey="prologue">
            <hr/>
            {
                prologue.length ? [
                    <Accordion.Item eventKey="prologue" key="prologue">
                        <Accordion.Header>Prologue</Accordion.Header>
                        <Accordion.Body><pre><code>{prologue.join('')}</code></pre></Accordion.Body>
                    </Accordion.Item>
                ] : []
            }
            {
                results.map(result => (<Result result={result} key={result.number}/>))
            }
            {
                epilogue.length ? [
                    <Accordion.Item eventKey="epilogue" key="epilogue">
                        <Accordion.Header>Epilogue</Accordion.Header>
                        <Accordion.Body><pre><code>{epilogue.join('')}</code></pre></Accordion.Body>
                    </Accordion.Item>
                ]: []
            }

        </Accordion>
    );
}

function Progress({ session }: { session: TapSession }): React.ReactElement {
    const { done, plan, stats } = useProperties(session, ['done', 'plan', 'stats']);
    const max = plan || 0;

    return (
        <ProgressBar animated={!done}>
            <ProgressBar animated={!done} max={max} key='p' variant='success' now={stats.pass}/>
            <ProgressBar animated={!done} max={max} key='s' variant='warning' now={stats.skip}/>
            <ProgressBar animated={!done} max={max} key='x' variant='info' now={stats.xfail}/>
            <ProgressBar animated={!done} max={max} key='X' variant='warning' now={stats.xpass}/>
            <ProgressBar animated={!done} max={max} key='f' variant='danger' now={stats.fail}/>
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
                await sleep(start / 5000);
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
