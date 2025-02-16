# Build stage
FROM --platform=linux/amd64 node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NEXT_PUBLIC_API_BASE_URL=https://justscoreca.delightfulsky-cfea119e.centralus.azurecontainerapps.io
RUN npm run build

# Production stage
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_BASE_URL=https://justscoreca.delightfulsky-cfea119e.centralus.azurecontainerapps.io
EXPOSE 3000
CMD ["npm", "start"] 