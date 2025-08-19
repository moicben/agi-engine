
# Désactiver le clavier de l'emulator
adb shell ime disable com.android.inputmethod.latin/.LatinIME


# Mettre la bonne densité de pixels (300 dpi)
adb shell wm density 320 


# Cacher la barre de control du téléphone
adb shell "settings put global policy_control immersive.navigation=*" 