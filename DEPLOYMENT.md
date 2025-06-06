# Руководство по развертыванию

## Подготовка к деплою

Перед развертыванием приложения на production убедитесь, что:

1. Все переменные окружения настроены правильно
2. WebAssembly модули корректно загружаются
3. Заголовки безопасности установлены для поддержки SharedArrayBuffer
4. Приложение протестировано с разными аудио файлами

## Проверка заголовков безопасности

Для корректной работы FFmpeg WebAssembly необходимы следующие заголовки:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Для проверки можно использовать инструменты разработчика в браузере (вкладка Network) или внешние сервисы для проверки заголовков HTTP.

## Настройка на Vercel

1. Подключите репозиторий к проекту Vercel
2. Настройте переменные окружения в интерфейсе Vercel:
   - `NEXT_PUBLIC_APPWRITE_URL`
   - `NEXT_PUBLIC_ENDPOINT`
   - `NEXT_PUBLIC_BUCKET_ID`
   - `NEXT_PUBLIC_DATABASE_ID`
   - `NEXT_PUBLIC_COLLECTION_ID_POSTS`

3. Убедитесь, что функции Middleware правильно настроены
4. После деплоя проверьте заголовки и работоспособность приложения

## Устранение проблем

### Проблема: SharedArrayBuffer is not defined

**Решение**: Проверьте, что middleware корректно добавляет необходимые заголовки безопасности.

### Проблема: Ошибки загрузки .wasm файлов

**Решение**: Убедитесь, что в webpack конфигурации корректно настроена обработка WebAssembly.

### Проблема: Ошибки загрузки в Appwrite

**Решение**: Проверьте, что все ID коллекций и бакетов установлены правильно, а также права доступа настроены корректно.

## Контрольный список для деплоя

- [ ] Заголовки безопасности настроены
- [ ] WebAssembly модули правильно импортированы
- [ ] Переменные окружения заданы
- [ ] Проведено тестирование на различных устройствах и браузерах
- [ ] Проверены права доступа в Appwrite

## Мониторинг после деплоя

После деплоя рекомендуется настроить мониторинг для отслеживания:

1. Потребления памяти (особенно при обработке больших аудио файлов)
2. Ошибок на стороне клиента (через Sentry или аналоги)
3. Производительности загрузки аудио файлов 