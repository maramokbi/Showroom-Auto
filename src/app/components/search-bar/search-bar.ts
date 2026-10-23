
import { Component, Input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Auto } from '../../interfaces/auto';

import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

@Component({
  imports: [FontAwesomeModule], 
  selector: 'app-search-bar',   
  styleUrl: './search-bar.css',   
  templateUrl: './search-bar.html',
})
export class SearchBar {
  faMagnifyingGlass = faMagnifyingGlass;
  @Input() autos: Auto[] = []
  @Output() onSelectCar = new EventEmitter<Auto>()
  selectedAutos: Auto[] = [];

  selectAutos(selectedBrand: string) {
    if (selectedBrand) {
      this.selectedAutos = this.autos.filter(auto => auto.brand.toLowerCase().startsWith(selectedBrand.toLowerCase()));
    } else {
      this.selectedAutos = this.autos;
    }
  }

  selectCar(auto: Auto) {
    this.onSelectCar.emit(auto);
  }
}
