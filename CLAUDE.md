# Forester – pravila rada

- **Spajanje je automatsko.** Kad su izmjene završene i provjerene (tsc, testovi, build), sam napravi PR i spoji ga u `main` (merge commit), bez čekanja da korisnik to traži. Spajanje u `main` pokreće GitHub Actions `android.yml` (APK + Pages), pa nakon spajanja provjeri da build prolazi. Ako je PR za granu već spojen, granu ne prepisuj force-pushom: spoji `main` u nju i otvori novi PR.
- Odgovaraj na bosanskom, tehničke termine ostavi na engleskom; kratko, objasni ZAŠTO.
- Interni akti su samo šifrovani u `data/private/spd.enc.json`; šifra se nikad ne upisuje u repozitorij.
