# MyApp - Android Application

Un'app Android semplice costruita con Java e Material Design.

## Struttura del progetto

```
app/
├── src/
│   ├── main/
│   │   ├── java/com/example/myapp/
│   │   │   ├── adapter/
│   │   │   │   └── ItemAdapter.java      # Adapter per RecyclerView
│   │   │   ├── model/
│   │   │   │   └── Item.java             # Modello dati
│   │   │   └── MainActivity.java         # Activity principale
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   ├── activity_main.xml     # Layout principale
│   │   │   │   └── item_card.xml         # Layout card per gli elementi
│   │   │   └── values/
│   │   │       ├── colors.xml
│   │   │       ├── strings.xml
│   │   │       ├── themes.xml
│   │   │       └── dimens.xml
│   │   └── AndroidManifest.xml
│   ├── test/                             # Unit test
│   └── androidTest/                      # Test strumentali
└── build.gradle
```

## Requisiti

- Android Studio Hedgehog o superiore
- Android SDK 34
- Java 8+
- Gradle 8.2

## Come avviare il progetto

1. Apri Android Studio
2. Seleziona **File > Open** e scegli questa cartella
3. Attendi la sincronizzazione Gradle
4. Collega un dispositivo Android o avvia un emulatore
5. Premi **Run** (Shift+F10)

## Funzionalità

- Lista di elementi con RecyclerView e CardView
- Aggiunta di nuovi elementi tramite FAB (Floating Action Button)
- Material Design con tema chiaro/scuro
- ViewBinding per accesso sicuro alle viste

## Dipendenze principali

- `androidx.appcompat:appcompat:1.6.1`
- `com.google.android.material:material:1.11.0`
- `androidx.constraintlayout:constraintlayout:2.1.4`
- `androidx.recyclerview:recyclerview:1.3.2`
- `androidx.cardview:cardview:1.0.0`
