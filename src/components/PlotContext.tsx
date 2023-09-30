import React from 'react';
import Vars from './types/Vars';
import { Observable, observable } from '@legendapp/state';

export type PlotContextType = {
    theme: Observable<object>,
    data: Observable<Array<number[]>>,
    dataMax: Observable<number>,
    vars: Observable<Vars>,
    width: Observable<string>,
    decorationWidth: Observable<string>,
    orientation: Observable<number>,
}

const PlotContext = React.createContext<PlotContextType>(
    {
        theme: observable({}),
        data: observable([]),
        dataMax: observable(0),
        vars: observable({} as Vars),
        width: observable(""),
        decorationWidth: observable(""),
        orientation: observable(0),
    }
);

export default PlotContext;