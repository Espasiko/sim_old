# Investigación 11-10-2025

## 1. Contexto general
- Objetivo principal: sustituir el servicio gestionado `https://copilot.sim.ai` por un microservicio local que integre Copilot en Sim sin costes externos.
- Se desea mantener intacta la UX de Sim, incluyendo chat, aprobaciones de cambios y tool-calls.
- El microservicio debe ejecutarse junto al proyecto `sim_old`, aprovechando BMAD para organizar PRD, arquitectura y plan de implementación.

## 2. Arquitectura actual del Copilot gestionado
1. La UI de Sim envía peticiones a `POST /api/copilot/chat` (Next.js).
2. `chat/route.ts` compone mensajes, selecciona herramientas y hace `fetch` a `SIM_AGENT_API_URL` (por defecto `https://copilot.sim.ai`).
3. El servicio remoto (Sim Agent) se encarga de prompting, tool-calls, RAG y devuelve respuestas por SSE o JSON.
4. Sim calcula costes después según tokens.

**Conclusión:** basta con interceptar el punto 2 (URL del agente) y proveer un microservicio compatible.

## 3. Plan del microservicio local
### 3.1 Cambios en el repositorio de Sim
| Área | Acción | Archivos |
|------|--------|----------|
| Configuración | Añadir variables `SIM_AGENT_API_URL`, `SIM_AGENT_API_KEY_LOCAL`, `SIM_AGENT_MODEL`, etc. | `.env.example`, `apps/sim/lib/env.ts`, `apps/sim/lib/sim-agent/constants.ts` |
| Rutas Copilot | Mejorar manejo de errores/timeouts al llamar al agente | `apps/sim/app/api/copilot/chat/route.ts`, `.../stats/route.ts`, `.../tools/*` |
| Providers | Registrar provider local (ej. `sim-local`) | `apps/sim/lib/copilot/config.ts`, `apps/sim/lib/copilot/types.ts` |
| Microservicio | Crear carpeta `services/sim-agent-local/` (o similar) con servidor HTTP compatible | Nuevo directorio |
| Scripts | Incluir comandos para arrancar el microservicio (`bun run sim-agent`, Docker opcional) | `package.json`, scripts auxiliares |
| Documentación | Generar PRD, arquitectura y notas con BMAD | `.bmad-core/...`, `docs/bmad/` |

### 3.2 Pipeline interno propuesto
1. **Ingesta**: recibir payload `messages`, `workflowId`, `provider`, etc. compatible con Sim.
2. **Comprensión**: LLM produce resumen, objetivos, restricciones del flujo solicitado.
3. **Planificación**: genera un plan estructurado (bloques, conexiones, variables) en JSON.
4. **Generación**: transforma el plan en YAML/operaciones (`edit_workflow`) según `ToolRegistry`.
5. **Validación**: LLM ligero + validaciones deterministas para garantizar coherencia antes de responder.
6. **Respuesta**: stream SSE compatible con la UI de Sim.

### 3.3 Despliegue y opciones
- **Directo (Node/TypeScript)**: importar utilidades de `apps/sim/lib/copilot/tools/server/*` para ejecutar instrumentos sin HTTP.
- **Loopback**: llamar a la API REST de Sim (`http://localhost:3000/api/...`) cuando se prefiera independencia de procesos.
- **Docker opcional**: empaquetar el microservicio (y modelos locales) para ejecutarlo en VPS.

## 4. Uso de BMAD para organizar el trabajo
1. `/analyst`: generar PRD (objetivo, alcance, riesgos) usando `prd-tmpl.yaml`.
2. `/architect`: producir documento técnico (diagrama de secuencia, módulos, dependencias).
3. `/sm` + `/dev`: crear historias (`create-next-story.md`) y ejecutarlas.
   - Historia 1: configuración/env.
   - Historia 2: microservicio base + endpoints.
   - Historia 3: pipeline (comprensión→plan→generación).
   - Historia 4: tool-calls y validación.
   - Historia 5: scripts / documentación.
4. `/qa`: usar checklists para validar chat, tool-calls, medición de costes, fallback.

## 5. Estrategia de modelos y proveedores
| Rol | Modelos | Notas |
|-----|---------|-------|
| **Generación principal** | Codestral (`codestral-latest`, `mistral-large-latest`), Groq (`gpt-oss`, `llama-3.1`, `qwen3-32b`…), Cohere (`command-r`, `command-r-plus`, `aya-expanse`). | Configurar `MISTRAL_API_KEY`, `MISTRAL_BASE_URL`, `GROQ_API_KEY`, `COHERE_API_KEY`. Tiers gratuitos disponibles. |
| **Modo offline** | FastAPI con GGUF de Mistral ya desplegado en VPS/local. | Útil cuando no se desee usar proveedores externos. |
| **Validación** | Llama 3.1 8B Instruct (Groq u Ollama), Phi-4 mini, etc. | Revisión semántica y estructural del YAML/JSON. |
| **Embeddings** | `all-minilm` (ya presente), `bge-small`, `e5-mistral`. | RAG específico del Copilot. |

## 6. Validación estructural
1. **LLM Verificador**: modelo ligero devuelve `{"valid": true/false, "issues": [...]}`.
2. **Esquemas deterministas**: usar `zod` / JSON Schema para comprobar:
   - Argumentos de herramientas (`ToolRegistry`).
   - Integridad de bloques / edges / variables.
   - Ausencia de ciclos o referencias rotas.

## 7. Herramientas del Copilot
- **Acceso directo**: importar funciones (menos latencia, ideal si microservicio vive en el repo).
- **Loopback HTTP**: útil si el microservicio se ejecuta como servicio separado.

## 8. Fuentes de conocimiento para el RAG del Copilot
| Fuente | Ubicación |
|--------|-----------|
| Documentación oficial | `apps/docs/content/docs/en/*` y `es/*` |
| Plantillas YAML | `apps/docs/content/docs/*/yaml/` |
| Código relevante | `apps/sim/lib/copilot/*.ts`, `apps/sim/providers/*.ts`, `apps/sim/lib/env.ts` |
| Ejemplos reales | `ejemplos/*.json` (ej. `Leads-generations-copy--SIM.json`) |
| Logs/Metricas | Carpeta de logs si se activa | 

- Se recomienda construir un índice vectorial “Copilot Docs” (pgvector, Qdrant). No mezclar con el RAG empresarial (BOE).

## 9. Infraestructura local (Ollama)
- Contenedor **`ollama-starter`** (imagen `ollama/ollama`) activo vía Docker Compose en `/home/espasiko/cascade_ia/self-hosted-ai-starter-kit`.
- Puerto expuesto: `11434`.
- Volume: `/var/lib/docker/volumes/self-hosted-ai-starter-kit_ollama_data/_data` ↔ `/root/.ollama`.
- Modelos disponibles actualmente: `tinyllama:latest` (637 MB), `all-minilm:latest` (45 MB).
- Se pueden añadir más modelos con `docker exec -it ollama-starter ollama pull <modelo>`.
- Si se desea mover los pesos a otro disco (por ejemplo `/mnt/e`), ajustar el bind mount en `docker-compose.yml`.

## 10. Proveedores externos y OpenRouter
### 10.1 Groq, Cohere y Codestral
- GroqCloud ofrece modelos abiertos (OpenAI GPT-OSS, Llama 3.1/4, Qwen) con latencia muy baja y tier gratuito.
- Cohere mantiene trial API keys gratuitas (Command R, Aya) y facturación pay-as-you-go.
- Mistral (Codestral) dispone de APIs, tier gratuito, y la opción de autohospedar (`MISTRAL_BASE_URL`).

### 10.2 OpenRouter (según artículo Medium)
- Plataforma que unifica ~300 modelos (OpenAI, Anthropic, Google, DeepSeek, etc.) bajo una única API key.
- Ventajas destacadas:
  - **Pago por uso** con precios transparentes por modelo.
  - **Multi-model chat** para probar modelos simultáneamente.
  - **Integraciones sencillas en IDE** (VSCode, JetBrains, Neovim) como sustituto de Copilot.
- Artículo: *"Breaking Free from AI Subscriptions: Cost-Effective All-in-One Solution with OpenRouter"* (Parvez Hossain Saurav, Medium, 2025).

## 11. Groq API Cookbook (hallazgos adicionales)
- Repositorio oficial de Groq con ejemplos recientes: <https://github.com/groq/groq-api-cookbook>.
- Estructura principal:
  - **Tool Calling / JSON estructurado**: `tutorials/function-calling-101-ecommerce`, `function-calling-sql`, `parallel-tool-use`, `structured-output-instructor`. Resultan ideales para adaptar el `ToolRegistry` de Sim y forzar salidas válidas.
  - **MCP Integrations**: ejemplos para BrowserUse, Browserbase, Firecrawl, Tavily, Exa y **HuggingFace MCP** (permite consultar catálogo de modelos en tiempo real). Útiles para crear MCP tools dentro de Sim.
  - **RAG**: `benchmarking-rag-langchain`, `whisper-podcast-rag` muestran cómo combinar Groq con LangChain y Whisper para pipelines robustos.
  - **Guardrails**: `llama-guard-safe-chatbot` integra Llama Guard como filtro de contenido; aplicable si se quieren moderar respuestas del Copilot.
  - **Integraciones**: `litellm-proxy-groq`, `composio`, `crewai`, `langroid`, `opentelemetry` orientan sobre observabilidad y orquestación multiagente.

### 11.1 Estrategia concreta con Groq para el Copilot local
- Utilizar los ejemplos de **Function Calling** y **Structured Output** como base para el microservicio local que generará YAML/JSON restringido.
- Implementar MCP de **Hugging Face** para consultar modelos, precios y licencias desde Sim (sin mantener bases de datos propias).
- Aplicar `llama-guard-safe-chatbot` si se requiere moderación adicional en conversaciones.
- Para RAG, reutilizar `benchmarking-rag-langchain` como blueprint al indexar los documentos de Sim.

### 11.2 Costes en Groq (octubre 2025)
- **Free tier**: sin cuota mensual, límite aproximado ~500k tokens/día y 30 RPS (según panel GroqCloud). Suficiente para desarrollo y uso diario del Copilot local.
- **Pay-as-you-go** (referencia pública): `gpt-oss-20b` ≈ $0.20/M tokens de entrada y $0.24/M tokens de salida. Otros modelos open-source tienen precios similares o menores.
- **Batch API**: 50 % de descuento para trabajos diferidos (útil para generación masiva de documentación de workflows).
- **Prompt caching**: tokens de entrada repetidos se facturan al 50 %.

### 11.3 Integración con OpenRouter
- OpenRouter actúa como plan de contingencia: una sola API key para más de 300 modelos con facturación por uso. No hay cuotas mensuales.
- Permite acceder a modelos que no estén en Groq (Claude, Gemini, etc.) sin suscripciones adicionales.
- Puede usarse como fallback en el microservicio (ej. selección dinámica Groq → Codestral → OpenRouter).

### 11.4 Recomendaciones prácticas
1. Adoptar GroqCloud como proveedor principal del Copilot local (latencia baja y coste cero durante el free tier).
2. Alternar con Codestral (Mistral) para generación de código/YAML y Cohere para razonamiento más narrativo.
3. Guardar la configuración de Groq, Codestral, Cohere y OpenRouter en `.env` (sin cuotas, solo pay-as-you-go si exceden el free tier).
4. Añadir a la colección RAG ejemplos del cookbook (especialmente tool-calls y JSON) para que el modelo aprenda patrones correctos.
5. Monitorizar consumo desde la consola de Groq y aprovechar prompt caching/batch para reducir costes si se sale del free tier.

## 11. Modelos open-source (Hugging Face) recomendados
- **Código/Reasoning**: `bigcode/starcoder2`, `deepseek-coder-v2`, `google/codegemma-7b`, `Qwen2.5-Coder`, `microsoft/Phi-4-mini`, `mistralai/codestral` (si liberan checkpoints).
- **Instruct general**: `meta-llama/Llama-3.1-*`, `google/gemma-2-9b-it`, `NousResearch/Hermes-3`, `CohereForAI/aya-expanse`.
- **Embeddings**: `sentence-transformers/all-MiniLM`, `intfloat/e5-mistral`, `bge-large`.
- Consumo: local (llama.cpp/Ollama/TGI) o vía Inference Endpoints / OpenRouter / Groq.
**tutoriales cookbook groq** 
https://github.com/groq/groq-api-cookbook/tree/main/tutorials
## 12. Ejemplo de workflow de referencia
- Archivo `ejemplos/Leads-generations-copy--SIM.json` (export Sim):
  - `state.blocks` → definición de nodos (tipo, params, posición).
  - `state.edges` → conexiones entre bloques.
  - `state.variables` y triggers.
- Usarlo como few-shot para enseñarle al modelo la estructura real de exportaciones.

## 13. Próximos pasos sugeridos
1. Ejecutar BMAD `/analyst` y `/architect` para formalizar PRD y arquitectura.
2. Instalar modelos adicionales en `ollama-starter` (ej. `llama3.1:8b`, `codestral:latest`).
3. Configurar `.env` con claves Mistral, Groq, Cohere y (si se desea) OpenRouter.
4. Implementar el microservicio local siguiendo el pipeline descrito.
5. Crear colección RAG “Copilot Docs” con la documentación y ejemplos del proyecto.
6. Generar historias BMAD y ejecutarlas (`/sm`, `/dev`, `/qa`).
7. Validar end-to-end: chat Ask/Agent, tool-calls, coste 0, fallback en caso de error.
8. Documentar resultado final (README, guía de despliegue, changelog).
