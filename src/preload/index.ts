import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openFile(filters: Electron.FileFilter[]): Promise<{ path: string; data: ArrayBuffer } | null>
  saveFile(defaultName: string, filters: Electron.FileFilter[]): Promise<string | null>
  setTitle(title: string): void
  isMaximized(): Promise<boolean>
}

const api: ElectronAPI = {
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (defaultName, filters) => ipcRenderer.invoke('dialog:saveFile', defaultName, filters),
  setTitle: (title) => ipcRenderer.invoke('app:setTitle', title),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized')
}

contextBridge.exposeInMainWorld('api', api)
