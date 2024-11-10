//
//  ContentView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//


import SwiftUI
import SafariServices

struct ContentView: View {
    var body: some View {
        #if os(iOS)
        if UIDevice.current.userInterfaceIdiom == .pad {
            iPadView()
        } else {
            iPhoneView()
        }
        #else
        MacView()
        #endif
    }
}

#if DEBUG
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
#endif
