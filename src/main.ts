import { TapSession } from './tap-session';

const session = new TapSession();
process.stdin.on("data", data => (session.feed(data.toString()))); // TODO: encoding buffer yada yada
process.stdin.on("end", () => {
    session.eof();
    console.log(session.version);
    console.log(session.plan);
    console.log(session.results);
});
