declare module '@vimeo/vimeo' {
    export class Vimeo {
        constructor(clientId: string, clientSecret: string, accessToken: string);
        request(options: any, callback: (error: any, body: any, statusCode?: number, headers?: any) => void): void;
        upload(
            file: any,
            params: any,
            completeCallback: (uri: string) => void,
            progressCallback: (bytesUploaded: number, bytesTotal: number) => void,
            errorCallback: (error: string) => void
        ): void;
    }
}
