import FullBar from './components/FullBar';
import BarContext from './components/BarContext';
import FullBarElementType from './components/types/FullBarElementType';
import { Observable } from '@legendapp/state';
import Vars from './components/types/Vars';


const FullBarWrapped = ({item}:{item: Observable<{index: number, order: number, data: number[], dataMax: number, elements: FullBarElementType[], theme: object, orientation: number, vars: Vars, width: string, decorationWidth: string, CSS: string}>}) => {

    const index = item.index.use();
    const order = item.order.use();
    const data = item.data.use();
    const elements = item.elements.use();
    const width = item.width.use();
    const decorationWidth = item.decorationWidth.use();
    const CSS = item.CSS.use();

    return (
        <BarContext.Provider value={{index: item.index, data: item.data, dataMax: item.dataMax, orientation: item.orientation, theme: item.theme, vars: item.vars, width: item.width, decorationWidth: item.decorationWidth}}>
            <div id="bar_plot" style={{width: "100%", height: "100%", padding: "6rem"}}>
                <div id={"Bar-and-dec-test"} style={{width: "100%", height: "100%"}}>
                    <div id={"full_bar_plot-1"} style={{width: "100%", height: "200px"}}>
                        <FullBar
                            index={index}
                            data={data}
                            elements={elements}
                            width={width}
                            decorationWidth={decorationWidth}
                            order={order}
                            CSS={CSS}
                        />
                    </div>
                </div>
            </div>
        </BarContext.Provider>
    )
};

export default FullBarWrapped;