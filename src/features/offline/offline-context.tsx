"use client";

import { createContext, useContext, useEffect, useState } from "react";

type OfflineContextValue = {
isOffline: boolean;
};

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false });

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
const updateOnlineStatus = () => {
setIsOffline(!navigator.onLine);
};

setIsOffline(!navigator.onLine);

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

return () => {
window.removeEventListener("online", updateOnlineStatus);
window.removeEventListener("offline", updateOnlineStatus);
};
}, []);

return (
 <OfflineContext.Provider value={{ isOffline }}>
  {children}
 </OfflineContext.Provider>
);
};