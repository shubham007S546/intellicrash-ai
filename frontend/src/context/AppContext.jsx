import React, { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [mobileSim, setMobileSim] = useState(() => {
    return localStorage.getItem("ic_mobile_sim") === "true";
  });
  
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    localStorage.setItem("ic_mobile_sim", mobileSim);
    if (mobileSim) {
      document.body.classList.add("mobile-sim-active");
    } else {
      document.body.classList.remove("mobile-sim-active");
    }
  }, [mobileSim]);

  return (
    <AppContext.Provider value={{ mobileSim, setMobileSim, sosActive, setSosActive }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
