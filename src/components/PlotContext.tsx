import React from 'react';
import type { Vars } from './types/Vars';
import { Observable, observable } from '@legendapp/state';

export type PlotContextType = {
    theme: Observable<object>,
    plotData: Observable<Array<number[]>>,
    dataMax: Observable<number>,
    vars: Observable<Vars>,
    orientation: Observable<number>,
}

const PlotContext = React.createContext<PlotContextType>(
    {
        theme: observable({}),
        plotData: observable([]),
        dataMax: observable(0),
        vars: observable({} as Vars),
        orientation: observable(0),
    }
);

export default PlotContext;