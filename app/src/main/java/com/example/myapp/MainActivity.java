package com.example.myapp;

import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.myapp.adapter.ItemAdapter;
import com.example.myapp.databinding.ActivityMainBinding;
import com.example.myapp.model.Item;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private ItemAdapter adapter;
    private List<Item> itemList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);

        setupRecyclerView();
        setupFab();
    }

    private void setupRecyclerView() {
        itemList = new ArrayList<>();
        itemList.add(new Item("Benvenuto in MyApp!", "Questa è la tua prima app Android"));
        itemList.add(new Item("Come iniziare", "Modifica il codice sorgente per personalizzare l'app"));
        itemList.add(new Item("Risorse utili", "Consulta la documentazione Android su developer.android.com"));

        adapter = new ItemAdapter(itemList, item ->
                Toast.makeText(this, "Selezionato: " + item.getTitle(), Toast.LENGTH_SHORT).show()
        );

        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
    }

    private void setupFab() {
        binding.fab.setOnClickListener(view -> {
            int count = itemList.size() + 1;
            Item newItem = new Item("Elemento " + count, "Aggiunto con il pulsante FAB");
            itemList.add(newItem);
            adapter.notifyItemInserted(itemList.size() - 1);
            binding.recyclerView.smoothScrollToPosition(itemList.size() - 1);
        });
    }
}
