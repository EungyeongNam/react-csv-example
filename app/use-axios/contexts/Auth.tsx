import {
  createContext,
  Dispatch,
  FC,
  SetStateAction,
  useContext,
  useEffect,
  useState
} from "react";

export interface IProfile {
  email: string;
  sub: string;
}

interface IAuthContext {
  profile: IProfile | null;
  isLoggedIn: boolean;
  setProfile: Dispatch<SetStateAction<IProfile | null>>;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>;
}

const AuthContext = createContext<IAuthContext>({
  profile: null,
  isLoggedIn: true,
  setProfile: () => undefined,
  setIsLoggedIn: () => undefined
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: FC = ({ children }) => {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const rawProfile = localStorage.getItem("profile");
    const accessToken = localStorage.getItem("access_token");
    if (rawProfile && accessToken) {
      const profile: IProfile = JSON.parse(rawProfile);
      setProfile(profile);
      setIsLoggedIn(true);
    }
  }, []);
  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoggedIn,
        setProfile,
        setIsLoggedIn
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
