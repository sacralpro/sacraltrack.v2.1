# VIBE Debugging Guide

## Overview
VIBE - это функциональность для обмена музыкальными моментами внутри приложения Sacral Track. Если у вас возникли проблемы с работой VIBE, эта инструкция поможет вам идентифицировать и исправить их.

## Проверка переменных окружения

Ключевые переменные окружения для VIBE:

```
NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS=67e12fba0030f49b4299
NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES=67e13057002b9cf3a78e
NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS=67e1309d0001b50192d5
NEXT_PUBLIC_COLLECTION_ID_VIBE_VIEWS=67e130ef00047eea82fc
```

Убедитесь, что:
1. Все ID указаны **без кавычек**
2. Все переменные находятся в файле `.env.local`
3. Файл `.env.local` находится в корне проекта

## Использование отладочных API

Мы создали несколько отладочных API для помощи в диагностике проблем с VIBE:

### 1. Проверка соединения с коллекциями

```
GET /api/debug-vibe-collections
```

Этот маршрут проверяет доступность коллекций VIBE и возвращает информацию о переменных окружения и статусе соединения.

### 2. Проверка соединения с Appwrite

```
GET /api/test-vibe-connection
```

Этот маршрут проверяет общее соединение с Appwrite и доступ к VIBE коллекциям.

### 3. Тестирование создания VIBE поста

```
POST /api/test-vibe-post
```

Тело запроса:
```json
{
  "userId": "ваш_id_пользователя"
}
```

Этот маршрут создает тестовый VIBE пост с заглушкой для медиа URL, позволяя проверить, работает ли создание записей в коллекции VIBE_POSTS.

## Отладка через консоль браузера

В компоненте `VibeUploader` и методе `createVibePost` добавлено расширенное логирование. При возникновении проблем:

1. Откройте консоль браузера (F12 или Cmd+Option+I)
2. Выполните действие, которое вызывает ошибку
3. Проверьте логи в консоли для получения подробной информации о процессе и возникающих ошибках

## Типичные проблемы и решения

1. **Файл загружается, но запись в коллекции не создается**
   - Проверьте переменные окружения (без кавычек)
   - Проверьте права доступа к коллекции VIBE_POSTS
   - Используйте `/api/test-vibe-post` для проверки доступа к коллекции

2. **Ошибка CORS при загрузке файла**
   - Проверьте настройки безопасности в консоли Appwrite
   - Убедитесь, что домен вашего приложения добавлен в список разрешенных

3. **Ошибка "Collection not found"**
   - Убедитесь, что используется правильный ID коллекции
   - Проверьте, существует ли коллекция в базе данных
   - Используйте `/api/debug-vibe-collections` для проверки доступности коллекций

## Создание коллекций VIBE

Если коллекции VIBE не существуют, вы можете создать их с помощью:

```
GET /api/init-vibe-collections
```

Этот маршрут создаст все необходимые коллекции для функциональности VIBE, включая атрибуты и индексы.

## Связь с поддержкой

Если проблемы с VIBE сохраняются, пожалуйста, обратитесь в поддержку с информацией:
1. Полный лог из консоли браузера
2. Результаты вызова `/api/debug-vibe-collections`
3. Описание ваших действий и ожидаемого результата 