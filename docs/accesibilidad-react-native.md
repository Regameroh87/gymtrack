# Accesibilidad en React Native

## ¿Qué es y por qué importa?

La accesibilidad permite que usuarios con discapacidades visuales, motoras o cognitivas puedan usar la app mediante tecnologías de asistencia:

- **iOS** → VoiceOver
- **Android** → TalkBack

Cuando un usuario activa estas herramientas, el sistema lee en voz alta el contenido de la pantalla y permite navegar con gestos especiales. Sin los props adecuados, los componentes personalizados son leídos de forma genérica o directamente ignorados.

---

## Props de accesibilidad principales

### `accessibilityRole`

Informa al sistema qué tipo de elemento es. Determina cómo lo anuncia el screen reader y qué gestos estándar aplica.

| Valor | Cuándo usarlo |
|-------|--------------|
| `"button"` | Cualquier `Pressable` o `TouchableOpacity` que ejecuta una acción |
| `"combobox"` | Selector / dropdown que abre una lista de opciones |
| `"option"` | Ítem dentro de una lista de selección (`combobox`) |
| `"text"` | Texto informativo sin interacción |
| `"header"` | Título de sección (permite navegación rápida en TalkBack) |
| `"image"` | Imagen (se combina con `accessibilityLabel` para describirla) |
| `"checkbox"` / `"radio"` | Controles de selección binaria o exclusiva |
| `"link"` | Navegación a otra pantalla o URL |
| `"none"` | Oculta el elemento al árbol de accesibilidad |

```jsx
<Pressable accessibilityRole="button" onPress={handleSave}>
  <Text>Guardar</Text>
</Pressable>
```

---

### `accessibilityLabel`

Texto que el screen reader lee en lugar del contenido visual del componente. Siempre debe ser descriptivo y en el idioma del usuario.

```jsx
// Mal — el reader solo lee "✓" o nada
<Pressable>
  <Text>✓</Text>
</Pressable>

// Bien
<Pressable accessibilityLabel="Confirmar ejercicio">
  <Text>✓</Text>
</Pressable>
```

Para componentes con estado, incluye el valor actual:

```jsx
<Pressable
  accessibilityLabel={`Categoría: ${selectedCategory ?? "Sin seleccionar"}`}
  accessibilityRole="combobox"
>
```

---

### `accessibilityHint`

Describe qué ocurre al activar el elemento. Se lee después del label con una pausa. Úsalo cuando la acción no es obvia.

```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Agregar serie"
  accessibilityHint="Añade una nueva serie al ejercicio actual"
  onPress={handleAddSet}
>
```

---

### `accessibilityState`

Comunica el estado actual del elemento. El screen reader lo anuncia automáticamente (ej: "seleccionado", "desactivado").

```jsx
// Ítem seleccionado en una lista
<Pressable
  accessibilityRole="option"
  accessibilityState={{ selected: isSelected }}
>

// Botón desactivado
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
  disabled={isLoading}
>

// Checkbox marcado
<Pressable
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isChecked }}
>
```

Estados disponibles: `selected`, `disabled`, `checked`, `busy`, `expanded`.

---

### `accessibilityValue`

Proporciona un valor numérico o textual (útil para sliders, progress bars, o campos con valor).

```jsx
<Slider
  accessibilityRole="adjustable"
  accessibilityLabel="Peso"
  accessibilityValue={{ min: 0, max: 300, now: weight, text: `${weight} kg` }}
/>
```

---

### `accessible` + `importantForAccessibility`

- `accessible={false}` excluye el elemento del árbol de accesibilidad (útil para decoraciones).
- `importantForAccessibility="no-hide-descendants"` (Android) oculta el elemento y todos sus hijos.

```jsx
// Icono decorativo — no leer
<Image
  source={icons.dumbbell}
  accessible={false}
/>
```

---

## Patrones comunes en esta app

### Selector (`CustomSelect`)

```jsx
// Trigger
<Pressable
  accessibilityRole="combobox"
  accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
  accessibilityHint="Abre una lista de opciones"
  accessibilityState={{ expanded: false }}
>

// Cada opción
<Pressable
  accessibilityRole="option"
  accessibilityLabel={option.label}
  accessibilityState={{ selected: isSelected }}
>
```

### Botón de acción con estado de carga

```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={isLoading ? "Guardando..." : "Guardar ejercicio"}
  accessibilityState={{ busy: isLoading, disabled: isLoading }}
  disabled={isLoading}
>
```

### Lista de ítems

Cuando la lista tiene un rol semántico claro, agrupa con `accessibilityRole` en el contenedor y `option` en cada ítem.

```jsx
<View accessibilityRole="list">
  {exercises.map((ex) => (
    <Pressable
      key={ex.id}
      accessibilityRole="option"
      accessibilityLabel={ex.name}
    >
```

---

## Cómo testear

### iOS — VoiceOver

1. `Ajustes → Accesibilidad → VoiceOver → Activar`
2. O triple clic en el botón lateral (si está configurado)
3. Navegar con swipe derecha/izquierda, activar con doble tap

### Android — TalkBack

1. `Ajustes → Accesibilidad → TalkBack → Activar`
2. Navegar con swipe derecha/izquierda, activar con doble tap

### Simulador iOS (sin activar VoiceOver)

Usar el **Accessibility Inspector** de Xcode:
`Xcode → Open Developer Tool → Accessibility Inspector`

Permite inspeccionar el árbol de accesibilidad sin navegar con VoiceOver activo.

---

## Checklist rápida

- [ ] Todo `Pressable` tiene `accessibilityRole`
- [ ] Iconos decorativos tienen `accessible={false}`
- [ ] Selectores muestran el valor actual en `accessibilityLabel`
- [ ] Ítems de lista tienen `accessibilityState={{ selected }}`
- [ ] Botones de carga tienen `accessibilityState={{ busy, disabled }}`
- [ ] Imágenes con contenido tienen `accessibilityLabel` descriptivo
- [ ] No hay texto de solo emoji sin label alternativo
