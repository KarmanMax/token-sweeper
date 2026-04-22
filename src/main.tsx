import React from "react"
import ReactDOM from "react-dom/client"
import "@rainbow-me/rainbowkit/styles.css"
import "./globals.css"
import { Web3Provider } from "@/components/providers"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
)
