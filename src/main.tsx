import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import App from "./App"
// import App from "./components/RhpDotAnimation"
import App from "./BoxAndWhiskerPlotExample"
// import App from "./FullBarTest"
// import App from "./TemplateTest"
// import { CoreComponent } from "./CoreComponent"

// import reportWebVitals from "./reportWebVitals"
// import * as serviceWorker from "./serviceWorker"


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// // If you want your app to work offline and load faster, you can change
// // unregister() to register() below. Note this comes with some pitfalls.
// // Learn more about service workers: https://cra.link/PWA
// serviceWorker.unregister()

// // If you want to start measuring performance in your app, pass a function
// // to log results (for example: reportWebVitals(console.log))
// // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()

