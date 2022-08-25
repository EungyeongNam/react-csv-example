import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { useCallback, useEffect, useMemo } from "react";

import { convertCaseList, ConvertType } from "../utils/convertString";

export interface IRequestConfig extends AxiosRequestConfig {
  _retry: boolean;
}

type AxiosMethod = "get" | "post" | "patch" | "put" | "delete";

interface IUseAxiosProps {
  url?: string;
  method?: AxiosMethod;
  axiosParams?: AxiosRequestConfig;
}

export const useAxios = ({ url, method, axiosParams }: IUseAxiosProps) => {
  const env = typeof window !== "undefined" ? window.ENV : process.env;

  const axiosInstance = axios.create({
    baseURL: env.API_ENDPOINT
  });
  const localAxiosInstance = axios.create({});

  const fetchData = useCallback(async () => {
    if (!method || !url || !axiosParams) return;
    const { data } = await axiosInstance[method](url, axiosParams);
    return convertCaseList(data, ConvertType.CAMEL);
  }, [url, method, axiosParams, axiosInstance]);

  const interceptors = useMemo(() => {
    return {
      request: (config: AxiosRequestConfig) => {
        const pass = ["/token"];

        if (pass.filter(u => config.url?.includes(u)).length !== 0)
          return config;

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) return Promise.reject("No Token");

        return {
          ...config,
          headers: {
            ...config.headers,
            authorization: `Bearer ${accessToken}`
          }
        };
      },
      requestError: (error: AxiosError) => {
        console.log("AxiosError (request error): ", { error });
        return Promise.reject(error);
      },
      response: (response: AxiosResponse) => response,
      responseError: (error: AxiosError) => {
        const originalRequest = error.config as IRequestConfig;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem("refresh_token");
          if (!refreshToken) return Promise.reject(error);

          return localAxiosInstance({
            method: "POST",
            url: env.OAUTH_REFRESH_TOKEN_ENDPOINT,
            data: {
              grant_type: "refresh_token",
              refresh_token: refreshToken
            }
          })
            .then(resp => {
              const { access_token, refresh_token } = resp.data;

              localStorage.setItem("access_token", access_token as string);
              localStorage.setItem("refresh_token", refresh_token as string);
              localStorage.setItem(
                "refresh_token_expires_at",
                (new Date().getTime() + 1800000).toString()
              );

              return axiosInstance({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  authorization: `Bearer ${access_token as string}`
                }
              });
            })
            .catch(err => {
              console.log("Axios Error (refresh_token): ", { err });
              window.location.replace(env.LOGIN_PATH ?? '/auth/login');
              return false;
            });
        }
        if (typeof error === "string" && error === "No Token") {
          window.location.replace(env.LOGIN_PATH ?? '/auth/login');
        }
        console.log("Axios Error (not 401): ", { error });
        return Promise.reject(error);
      }
    };
  }, []);

  useEffect(() => {
    axiosInstance.interceptors.request.use(
      interceptors.request,
      interceptors.requestError
    );
    axiosInstance.interceptors.response.use(
      interceptors.response,
      interceptors.responseError
    );
  });

  return {
    axiosInstance,
    fetchData
  };
};
