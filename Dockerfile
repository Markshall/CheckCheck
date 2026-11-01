# Development image only — production is the static build in dist/.
FROM node:24-alpine

WORKDIR /app

EXPOSE 5174

# node_modules lives in a named volume that outlives image rebuilds, so
# reinstall at startup whenever package-lock.json has changed.
CMD ["sh", "-c", "cmp -s package-lock.json node_modules/.lock-stamp || { npm ci && cp package-lock.json node_modules/.lock-stamp; }; exec npm run dev"]
