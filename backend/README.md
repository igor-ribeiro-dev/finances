# Finances — Backend

API Express + Prisma 7 (Postgres). Veja `../specs/` para o contexto das features.

## Manutenção

### Limpeza da tabela `IdempotencyKey`

Cada `POST /api/v1/expenses` armazena uma chave de idempotência (TTL 24h). A
remoção é feita por um script externo idempotente:

```bash
npm run cleanup:idempotency
```

**Agendamento sugerido**: cron diário às 03:00 (horário de baixa carga).

Exemplos:

- crontab do host:
  ```cron
  0 3 * * * cd /opt/finances/backend && /usr/bin/npm run cleanup:idempotency >> /var/log/finances/cleanup.log 2>&1
  ```
- Kubernetes `CronJob`:
  ```yaml
  apiVersion: batch/v1
  kind: CronJob
  metadata:
    name: finances-idempotency-cleanup
  spec:
    schedule: "0 3 * * *"
    jobTemplate:
      spec:
        template:
          spec:
            containers:
              - name: cleanup
                image: ghcr.io/your-org/finances-backend:latest
                command: ["npm", "run", "cleanup:idempotency"]
            restartPolicy: OnFailure
  ```

### Variáveis de ambiente

O script usa o mesmo `DATABASE_URL` da aplicação. Garanta que esteja exportado
no ambiente do agendador (cron / pod env).
