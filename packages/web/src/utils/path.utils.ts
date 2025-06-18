export const sanitizePath = (path: string) => {
    return path.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
} 