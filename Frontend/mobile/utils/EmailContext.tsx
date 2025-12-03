
// Source - https://stackoverflow.com/a
// Posted by Spyros Argalias, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-01, License - CC BY-SA 4.0

import React, { createContext, useState } from 'react';

type EmailContextType = {
  userEmail: string;
  setUserEmail: React.Dispatch<React.SetStateAction<string>>;
};

export const EmailContext = createContext<EmailContextType>(
  null as unknown as EmailContextType,
);

type EmailProviderProps = {
  children: React.ReactNode;
};

export const EmailProvider = ({ children }: EmailProviderProps) => {
  const [userEmail, setUserEmail] = useState("");
  const value = {
    userEmail,
    setUserEmail,
  };

  return (
    <EmailContext.Provider value={value}>{children}</EmailContext.Provider>
  );
};
