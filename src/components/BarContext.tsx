import React from 'react';
import type { Observable } from '@legendapp/state';
import {  observable } from '@legendapp/state';

export type BarContextType = {
    index: Observable<number>,
    order: Observable<number>,
    data: Observable<number[]>,
    width: Observable<string>,
    decorationWidth: Observable<string>,
}

const BarContext = React.createContext<BarContextType>(
    {
        index: observable(0),
        order: observable(0),
        data: observable([]),
        width: observable(""),
        decorationWidth: observable(""),
    }
);

export default BarContext;