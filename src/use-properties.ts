import { useEffect, useState } from 'react';
import { EventEmitter } from 'events';

/*
 * Warning: The result of getSnapshot should be cached to avoid an infinite loop
 * Sigh.

function useProperties<StateType extends EventEmitter, Keys extends keyof StateType>(src: StateType, keys: Keys[]): Pick<StateType, Keys> {
    function clone_value<K extends keyof StateType>(key: K): StateType[K] {
        const value = src[key];
        if (Array.isArray(value)) {
            return [...value];
        } else {
            return value;
        }
    }

    function getSnapshot(): Pick<StateType, Keys> {
        const entries = keys.map(key => [key, clone_value(key)]);
        return Object.fromEntries(entries);
    }

    function subscribe(callback: () => void) {
        function notify(changed: Set<keyof StateType>) {
            if (keys.some(x => changed.has(x))) {
                callback();
            }
        }

        src.on('notify', notify);
        return () => src.off('notify', notify);
    }

    return React.useSyncExternalStore(subscribe, getSnapshot);
}
*/

export default function useProperties<StateType extends EventEmitter, Keys extends keyof StateType>(src: StateType, keys: Keys[]): Pick<StateType, Keys> {
    function getSnapshot(): Pick<StateType, Keys> {
        const entries = keys.map(key => [key, src[key]]);
        return Object.fromEntries(entries);
    }

    const [ state, setState ] = useState(getSnapshot());

    useEffect(() => {
        function notify(changed: Set<keyof StateType>) {
            if (keys.some(x => changed.has(x))) {
                setState(getSnapshot());
            }
        }

        src.on('notify', notify);
        return () => { src.off('notify', notify); };
    });

    return state;
}
