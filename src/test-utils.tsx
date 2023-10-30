import * as React from "react"
import { render, RenderOptions, queries } from "@testing-library/react"
import { ChakraProvider, theme } from "@chakra-ui/react"

const AllProviders = ({ children }: { children?: React.ReactNode }) => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
)

const customRender = (ui: React.ReactElement, options?: RenderOptions<typeof queries>) =>
  render(ui, { wrapper: AllProviders, ...options })

export { customRender as render }
