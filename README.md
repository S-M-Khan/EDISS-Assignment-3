# Bookstore Cloud Architecture - Assignment 3

## Project Overview

This project implements a cloud-native microservices-based bookstore application deployed on Amazon EKS (Kubernetes). It follows the **BFF (Backend for Frontend)** pattern to support both Web and Mobile clients, integrates an LLM (Gemini 3.1 Flash Lite) for automated book summaries, and includes a **Circuit Breaker** pattern for resilient communication with an external recommendation service.

---

## Architecture

The system is composed of the following layers:

### 1. Kubernetes Cluster (EKS)

All services are containerized and deployed on Amazon EKS, providing scalability, fault tolerance, and orchestration.

---

### 2. BFF Layer (Public Access via LoadBalancer)

#### `web-bff`
- Serves web clients
- Returns full data objects

#### `mobile-bff`
- Serves mobile clients
- Returns optimized responses

**Both BFFs:**
- Expose Kubernetes `LoadBalancer` services (Port 80)
- Handle authentication (JWT)
- Route requests to backend services

---

### 3. Backend Services (Cluster Internal)

#### `book-service`
- Manages book data
- Integrates with:
  - Gemini API (LLM) for summaries
  - External Recommendation Service
- Implements **Circuit Breaker** pattern

#### `customer-service`
- Manages customer data
- Publishes events to Kafka

#### `crm-service`
- Kafka consumer
- Sends welcome email notifications to newly registered customers

**All backend services:**
- Communicate internally via `ClusterIP` services
- Run on Port `3000` (or `80` where required)

---

### 4. Database Layer

- Amazon RDS Aurora (MySQL-compatible)
- Uses **Database-per-Microservice** pattern:
  - `bookdb` → used exclusively by `book-service`
  - `customerdb` → used exclusively by `customer-service`

---

### 5. External Services

- **Recommendation Service**
  - Used by `book-service` for `/related-books`
- **Gemini API**
  - Generates book summaries asynchronously

---

## Key Engineering Decisions

### 1. Circuit Breaker Pattern

Implemented in `book-service` for the endpoint:

```
GET /books/{ISBN}/related-books
```

| State | Behavior | Response |
|-------|----------|----------|
| Closed (normal) | Calls external service | `200` or `204` |
| Timeout (>3s) | Opens circuit | `504` |
| Open (<60s elapsed) | Fails fast | `503` |
| Half-Open (after 60s) | Retries external service | `200`/`204` or `503` |

Circuit state is persisted using a Kubernetes `emptyDir` volume mounted at:

```
/circuit-state.json
```

---

### 2. Async LLM Polling Logic

To handle Gemini API latency:

- `POST /books` → returns immediately (`201`)
- `GET /books/{ISBN}` → polls DB up to ~3 seconds if summary is missing

This ensures no blocking writes and consistent responses for the autograder.

---

### 3. Kubernetes Networking

BFFs exposed via:
```yaml
Service Type: LoadBalancer
Port: 80
```

Internal services:
```yaml
Service Type: ClusterIP
Port: 3000
```

Service discovery via Kubernetes DNS:
```
http://book-service:3000
http://customer-service:3000
```

---

### 4. Environment-Based Configuration

Sensitive and dynamic values are injected via:

- **Kubernetes Secrets**
  - DB credentials
  - SMTP credentials
  - API keys
- **Environment Variables**
  - `DB_HOST`
  - `DB_NAME`
  - `RECOMMENDATION_SERVICE_URL`
  - `GEMINI_API_KEY`

---

## Deployment Instructions

### 1. Apply Kubernetes Resources

```bash
kubectl apply -f bookstore-ns.yaml
kubectl apply -f secrets-template.yaml
kubectl apply -f book-service/k8s/book-deployment.yaml
kubectl apply -f customer-service/k8s/customer-deployment.yaml
kubectl apply -f crm-service/k8s/crm-deployment.yaml
kubectl apply -f web-bff/k8s/web-bff-deployment.yaml
kubectl apply -f mobile-bff/k8s/mobile-bff-deployment.yaml
```

### 2. Verify Pods

```bash
kubectl get pods -n bookstore-ns
```

### 3. Get External Endpoints

```bash
kubectl get svc -n bookstore-ns
```

### 4. Test Endpoints

**Status Check:**
```bash
curl http://<WEB_BFF_ELB>/status
```

**Related Books (Circuit Breaker):**
```bash
curl -i \
  -H "Authorization: Bearer <JWT>" \
  -H "X-Client-Type: web" \
  http://<WEB_BFF_ELB>/books/9780133065107/related-books
```

**Expected responses:**
| Code | Meaning |
|------|---------|
| `200` | Success with results |
| `204` | Success, no results |
| `504` | External service timeout |
| `503` | Circuit open |

---

## Summary

This system demonstrates:

- ✅ Microservices architecture on Kubernetes (EKS)
- ✅ BFF pattern for multi-client support
- ✅ Kafka publish-subscribe for async customer events
- ✅ LLM integration for automated book summaries
- ✅ Fault tolerance using Circuit Breaker
- ✅ DB-per-microservice pattern
- ✅ Secure configuration with Kubernetes Secrets
- ✅ Cloud-native deployment on AWS