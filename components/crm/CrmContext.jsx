'use client';
import { createContext, useContext } from 'react';
export const CrmCtx = createContext(null);
export const useCrm = () => useContext(CrmCtx);
