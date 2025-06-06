FROM node:20 AS build
WORKDIR /opt/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run migrate:generate
RUN npm run build --prod

FROM node:24.1.0-alpine3.22 AS final
WORKDIR /opt/app

RUN apk add --no-cache openssl

COPY --chmod=755 .entrypoint.sh /opt/app/entrypoint.sh

COPY --from=build /opt/app/package.json ./
COPY --from=build /opt/app/package-lock.json ./
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/prisma ./prisma 

RUN npm ci --omit=dev

USER node

EXPOSE 8000 

ENTRYPOINT ["/opt/app/entrypoint.sh"]

CMD [ "npm", "run", "start:prod" ]