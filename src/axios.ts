import axios, { AxiosInterceptorManager, AxiosRequestConfig, AxiosResponse } from "axios";

export class Axios {
    public interceptors: {
        request: AxiosInterceptorManager<AxiosRequestConfig>;
        response: AxiosInterceptorManager<AxiosResponse>;
    }

    constructor(config: AxiosRequestConfig) {
        return axios.create(config);
    }
}