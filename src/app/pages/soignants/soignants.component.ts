import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner } from '../../core/models/practitioner.model';

@Component({
  selector: 'app-soignants',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './soignants.component.html',
  styleUrl: './soignants.component.scss'
})
export class SoignantsComponent implements OnInit {
  private svc = inject(PractitionerService);

  stats       = this.svc.stats;
  searchQuery = '';

  // ID du soignant dont les rôles sont affichés
  selectedId = signal<string | null>(null);

  // Soignant à supprimer (null = modal fermée)
  toDelete   = signal<Practitioner | null>(null);

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.svc.practitioners();
    return this.svc.practitioners().filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)  ||
      p.rpps.includes(q)                    ||
      p.specialty.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.svc.loadAll();
  }

  onSearch(): void { /* computed se recalcule automatiquement */ }

  // ---- Rôles ----
  toggleRoles(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  // ---- Suppression ----
  askDelete(p: Practitioner): void {
    this.toDelete.set(p);
  }

  cancelDelete(): void {
    this.toDelete.set(null);
  }

  confirmDelete(): void {
    const p = this.toDelete();
    if (!p?.id) return;
    this.svc.delete(p.id).subscribe(() => {
      if (this.selectedId() === p.id) this.selectedId.set(null);
      this.toDelete.set(null);
    });
  }
}
