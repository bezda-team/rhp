import React from 'react';
import Vars from './types/Vars';
import { Observable, observable } from '@legendapp/state';

export type BarContextType = {
    index: Observable<number>,
    theme: Observable<object>,
    data: Observable<number[]>,
    dataMax: Observable<number>,
    vars: Observable<Vars>,
    width: Observable<string>,
    decorationWidth: Observable<string>,
    orientation: Observable<number>,
}

const BarContext = React.createContext<BarContextType>(
    {
        index: observable(0),
        theme: observable({}),
        data: observable([]),
        dataMax: observable(0),
        vars: observable({} as Vars),
        width: observable(""),
        decorationWidth: observable(""),
        orientation: observable(0),
    }
);

export default BarContext;