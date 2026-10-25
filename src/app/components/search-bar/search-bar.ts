
import { Component, Input, OnInit , output } from '@angular/core';
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
export class SearchBar implements OnInit{
  faMagnifyingGlass = faMagnifyingGlass;
  @Input() autos: Auto[] = []
  @Output() onSelectCar = new EventEmitter<Auto>()
  selectedAutos: Auto[] = [];
  currentBrand: string = '';
  
ngOnInit() {
    this.selectedAutos = this.autos;
    }

  selectAutos(selectedBrand: string) {
    this.currentBrand = selectedBrand.trim();
    if (selectedBrand) {
      this.selectedAutos = this.autos.filter(auto => (auto.brand + ' ' + auto.model).toLowerCase().includes(selectedBrand.toLowerCase()));
    } else {
      this.selectedAutos = this.autos;
    }
    this.currentBrand = selectedBrand.trim();
  }

  selectCar(auto: Auto) {
    this.onSelectCar.emit(auto);
  }
}
function ngOnInit() {
  throw new Error('Function not implemented.');
}

