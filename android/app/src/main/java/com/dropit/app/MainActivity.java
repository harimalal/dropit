package com.dropit.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Sans ça, le réglage "Taille d'affichage" du téléphone agrandit tout
        // le texte de la WebView au-delà des tailles CSS — jamais le cas dans
        // un onglet Chrome classique, d'où le rendu "massif" vu uniquement
        // dans l'app installée.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
