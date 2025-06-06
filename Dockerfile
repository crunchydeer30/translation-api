FROM node:20 as build
WORKDIR /opt/app
ADD . .
RUN npm ci
RUN npm run migrate:generate
RUN npm run build --prod


FROM node:24.1.0-alpine3.22
WORKDIR /opt/app
COPY --from=build /opt/app/dist ./dist
ADD *.json ./
ADD ./prisma ./prisma
ADD ./libs ./libs
RUN npm ci --omit=dev
RUN npm run migrate:generate

CMD [ "npm", "run", "start:prod" ]